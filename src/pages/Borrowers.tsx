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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Borrowers = () => {
  const [search, setSearch] = useState("");

  const { data: borrowers, isLoading } = useQuery({
    queryKey: ["borrowers", search],
    queryFn: async () => {
      let query = supabase
        .from("borrowers")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,id_number.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Borrowers</h1>
          <p className="text-muted-foreground">Manage your borrower database</p>
        </div>
        <Link to="/borrowers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Borrower
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID number, or phone..."
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
                  <TableHead>Name</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowers && borrowers.length > 0 ? (
                  borrowers.map((borrower) => (
                    <TableRow key={borrower.id}>
                      <TableCell className="font-medium">{borrower.full_name}</TableCell>
                      <TableCell>{borrower.id_number}</TableCell>
                      <TableCell>{borrower.phone}</TableCell>
                      <TableCell>{borrower.email || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/borrowers/${borrower.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {search ? "No borrowers found" : "No borrowers yet. Create your first borrower!"}
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

export default Borrowers;
