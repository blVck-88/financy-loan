import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const NewLoan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    borrower_id: "",
    principal: "",
    interest_rate: "",
    term_months: "",
    frequency: "monthly",
    disbursement_date: new Date().toISOString().split("T")[0],
  });

  const [calculations, setCalculations] = useState({
    total_interest: 0,
    total_payable: 0,
    instalment_amount: 0,
    num_instalments: 0,
  });

  const { data: borrowers } = useQuery({
    queryKey: ["borrowers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("borrowers")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const { principal, interest_rate, term_months, frequency } = formData;
    
    if (principal && interest_rate && term_months) {
      const p = parseFloat(principal);
      const r = parseFloat(interest_rate) / 100;
      const t = parseInt(term_months);
      
      const totalInterest = p * r * (t / 12);
      const totalPayable = p + totalInterest;
      
      let numInstalments = t;
      if (frequency === "weekly") {
        numInstalments = Math.ceil((t * 30) / 7);
      } else if (frequency === "daily") {
        numInstalments = t * 30;
      }
      
      const instalmentAmount = totalPayable / numInstalments;
      
      setCalculations({
        total_interest: totalInterest,
        total_payable: totalPayable,
        instalment_amount: instalmentAmount,
        num_instalments: numInstalments,
      });
    }
  }, [formData.principal, formData.interest_rate, formData.term_months, formData.frequency]);

  const createLoan = useMutation({
    mutationFn: async (data: any) => {
      // Create loan
      const { data: loan, error: loanError } = await supabase
        .from("loans")
        .insert({
          ...data,
          loan_officer_id: user?.id,
          total_interest: calculations.total_interest,
          total_payable: calculations.total_payable,
          instalment_amount: calculations.instalment_amount,
        })
        .select()
        .single();

      if (loanError) throw loanError;

      // Generate repayment schedule
      const schedule = [];
      const startDate = new Date(data.disbursement_date);
      
      for (let i = 1; i <= calculations.num_instalments; i++) {
        let dueDate = new Date(startDate);
        
        if (data.frequency === "monthly") {
          dueDate.setMonth(dueDate.getMonth() + i);
        } else if (data.frequency === "weekly") {
          dueDate.setDate(dueDate.getDate() + (i * 7));
        } else if (data.frequency === "daily") {
          dueDate.setDate(dueDate.getDate() + i);
        }
        
        schedule.push({
          loan_id: loan.id,
          instalment_number: i,
          due_date: dueDate.toISOString().split("T")[0],
          amount_due: calculations.instalment_amount,
        });
      }

      const { error: scheduleError } = await supabase
        .from("repayment_schedule")
        .insert(schedule);

      if (scheduleError) throw scheduleError;

      return loan;
    },
    onSuccess: (loan) => {
      toast.success("Loan created successfully");
      navigate(`/loans/${loan.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create loan");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLoan.mutate({
      borrower_id: formData.borrower_id,
      principal: parseFloat(formData.principal),
      interest_rate: parseFloat(formData.interest_rate),
      term_months: parseInt(formData.term_months),
      frequency: formData.frequency,
      disbursement_date: formData.disbursement_date,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/loans")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Loan</h1>
          <p className="text-muted-foreground">Create a new loan application</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="borrower_id">Borrower *</Label>
                <Select
                  value={formData.borrower_id}
                  onValueChange={(value) => setFormData({ ...formData, borrower_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select borrower" />
                  </SelectTrigger>
                  <SelectContent>
                    {borrowers?.map((borrower) => (
                      <SelectItem key={borrower.id} value={borrower.id}>
                        {borrower.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="principal">Principal Amount *</Label>
                <Input
                  id="principal"
                  type="number"
                  step="0.01"
                  value={formData.principal}
                  onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest_rate">Interest Rate (%) *</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.01"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="term_months">Loan Term (Months) *</Label>
                <Input
                  id="term_months"
                  type="number"
                  value={formData.term_months}
                  onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Payment Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disbursement_date">Disbursement Date *</Label>
                <Input
                  id="disbursement_date"
                  type="date"
                  value={formData.disbursement_date}
                  onChange={(e) => setFormData({ ...formData, disbursement_date: e.target.value })}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loan Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Principal:</span>
                  <span className="font-medium">
                    ${parseFloat(formData.principal || "0").toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Interest:</span>
                  <span className="font-medium">
                    ${calculations.total_interest.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Payable:</span>
                  <span className="text-primary">
                    ${calculations.total_payable.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Number of Instalments:</span>
                  <span className="font-medium">{calculations.num_instalments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Instalment Amount:</span>
                  <span className="font-medium">
                    ${calculations.instalment_amount.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate("/loans")}>
            Cancel
          </Button>
          <Button type="submit" disabled={createLoan.isPending}>
            {createLoan.isPending ? "Creating..." : "Create Loan"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewLoan;
