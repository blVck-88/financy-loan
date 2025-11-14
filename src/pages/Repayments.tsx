import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Repayments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLoan, setSelectedLoan] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: activeLoans } = useQuery({
    queryKey: ["active-loans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("id, borrowers(full_name), principal, total_payable")
        .in("status", ["active", "disbursed"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: recentRepayments } = useQuery({
    queryKey: ["recent-repayments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repayments")
        .select("*, loans(borrowers(full_name))")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const recordRepayment = useMutation({
    mutationFn: async (data: { loan_id: string; amount: number; notes: string }) => {
      // Get the next unpaid instalment
      const { data: schedule, error: scheduleError } = await supabase
        .from("repayment_schedule")
        .select("*")
        .eq("loan_id", data.loan_id)
        .eq("is_paid", false)
        .order("instalment_number")
        .limit(1)
        .single();

      if (scheduleError) throw scheduleError;

      // Record the repayment
      const { error: repaymentError } = await supabase
        .from("repayments")
        .insert({
          loan_id: data.loan_id,
          schedule_id: schedule.id,
          amount: data.amount,
          recorded_by: user?.id,
          notes: data.notes,
          payment_date: new Date().toISOString().split("T")[0],
        });

      if (repaymentError) throw repaymentError;

      // Update the schedule
      const newAmountPaid = Number(schedule.amount_paid) + data.amount;
      const isPaid = newAmountPaid >= Number(schedule.amount_due);

      const { error: updateError } = await supabase
        .from("repayment_schedule")
        .update({
          amount_paid: newAmountPaid,
          is_paid: isPaid,
          paid_date: isPaid ? new Date().toISOString().split("T")[0] : null,
        })
        .eq("id", schedule.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Repayment recorded successfully");
      setSelectedLoan("");
      setAmount("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["recent-repayments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to record repayment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    recordRepayment.mutate({
      loan_id: selectedLoan,
      amount: parseFloat(amount),
      notes,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Repayments</h1>
        <p className="text-muted-foreground">Record and manage loan repayments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record New Repayment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="loan">Loan *</Label>
                <Select value={selectedLoan} onValueChange={setSelectedLoan} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLoans?.map((loan: any) => (
                      <SelectItem key={loan.id} value={loan.id}>
                        {loan.borrowers?.full_name} - ${Number(loan.principal).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={recordRepayment.isPending}>
              {recordRepayment.isPending ? "Recording..." : "Record Repayment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Repayments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRepayments && recentRepayments.length > 0 ? (
                recentRepayments.map((repayment: any) => (
                  <TableRow key={repayment.id}>
                    <TableCell>
                      {new Date(repayment.payment_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{repayment.loans?.borrowers?.full_name}</TableCell>
                    <TableCell className="font-medium">
                      ${Number(repayment.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {repayment.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No repayments recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Repayments;
