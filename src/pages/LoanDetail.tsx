import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: loan, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("*, borrowers(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: schedule } = useQuery({
    queryKey: ["repayment-schedule", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repayment_schedule")
        .select("*")
        .eq("loan_id", id)
        .order("instalment_number");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loan) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "cleared":
        return "default";
      case "active":
      case "disbursed":
        return "secondary";
      case "pending_approval":
        return "outline";
      default:
        return "destructive";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/loans")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Loan Details</h1>
          <p className="text-muted-foreground">{loan.borrowers?.full_name}</p>
        </div>
        <Badge variant={getStatusVariant(loan.status)}>
          {loan.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Principal:</span>
              <span className="font-medium">${Number(loan.principal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interest Rate:</span>
              <span className="font-medium">{loan.interest_rate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Interest:</span>
              <span className="font-medium">${Number(loan.total_interest).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="font-semibold">Total Payable:</span>
              <span className="font-semibold text-primary">
                ${Number(loan.total_payable).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Instalment Amount:</span>
              <span className="font-medium">${Number(loan.instalment_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency:</span>
              <span className="font-medium capitalize">{loan.frequency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Term:</span>
              <span className="font-medium">{loan.term_months} months</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Borrower Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{loan.borrowers?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID Number:</span>
              <span className="font-medium">{loan.borrowers?.id_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{loan.borrowers?.phone}</span>
            </div>
            {loan.borrowers?.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{loan.borrowers.email}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repayment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Penalty</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedule?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.instalment_number}</TableCell>
                  <TableCell>{new Date(item.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>${Number(item.amount_due).toLocaleString()}</TableCell>
                  <TableCell>${Number(item.amount_paid).toLocaleString()}</TableCell>
                  <TableCell>
                    {item.penalty > 0 ? `$${Number(item.penalty).toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.is_paid ? "default" : "outline"}>
                      {item.is_paid ? "Paid" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanDetail;
