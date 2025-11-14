import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Loans = () => {
  const [search, setSearch] = useState("");

  const { data: loans, isLoading } = useQuery({
    queryKey: ["loans", search],
    queryFn: async () => {
      let query = supabase
        .from("loans")
        .select("*, borrowers(full_name)")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`borrowers.full_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "cleared":
        return "default";
      case "active":
      case "disbursed":
        return "secondary";
      case "pending_approval":
        return "outline";
      case "rejected":
      case "defaulted":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loans</h1>
          <p className="text-muted-foreground">Manage all loan applications</p>
        </div>
        <Link to="/loans/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Loan
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by borrower name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Total Payable</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans && loans.length > 0 ? (
                  loans.map((loan: any) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">
                        {loan.borrowers?.full_name}
                      </TableCell>
                      <TableCell>${Number(loan.principal).toLocaleString()}</TableCell>
                      <TableCell>${Number(loan.total_payable).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(loan.status)}>
                          {loan.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{loan.frequency}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/loans/${loan.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {search ? "No loans found" : "No loans yet. Create your first loan!"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Loans;
