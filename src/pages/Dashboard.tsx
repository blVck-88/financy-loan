import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [borrowersRes, loansRes, repaymentsRes, overdueRes] = await Promise.all([
        supabase.from("borrowers").select("id", { count: "exact", head: true }),
        supabase.from("loans").select("principal, status"),
        supabase.from("repayments").select("amount"),
        supabase
          .from("loans")
          .select("id")
          .eq("status", "active")
          .select("*, repayment_schedule!inner(*)")
          .lt("repayment_schedule.due_date", new Date().toISOString())
          .eq("repayment_schedule.is_paid", false),
      ]);

      const totalBorrowers = borrowersRes.count || 0;
      
      const activeLoans = loansRes.data?.filter(l => 
        ["active", "disbursed"].includes(l.status)
      ).length || 0;
      
      const totalDisbursed = loansRes.data?.reduce((sum, loan) => 
        sum + Number(loan.principal), 0
      ) || 0;
      
      const totalCollected = repaymentsRes.data?.reduce((sum, payment) => 
        sum + Number(payment.amount), 0
      ) || 0;
      
      const overdueLoans = overdueRes.data?.length || 0;

      return {
        totalBorrowers,
        activeLoans,
        totalDisbursed,
        totalCollected,
        overdueLoans,
      };
    },
  });

  const { data: recentLoans } = useQuery({
    queryKey: ["recent-loans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("loans")
        .select("*, borrowers(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data;
    },
  });

  const statCards = [
    {
      title: "Total Borrowers",
      value: stats?.totalBorrowers || 0,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Active Loans",
      value: stats?.activeLoans || 0,
      icon: Wallet,
      color: "text-success",
    },
    {
      title: "Total Disbursed",
      value: `$${(stats?.totalDisbursed || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      title: "Total Collected",
      value: `$${(stats?.totalCollected || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your loan management system</p>
      </div>

      {stats && stats.overdueLoans > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertCircle className="h-5 w-5 text-warning" />
            <span className="font-medium">
              {stats.overdueLoans} loan{stats.overdueLoans > 1 ? "s" : ""} overdue
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Loans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentLoans && recentLoans.length > 0 ? (
              recentLoans.map((loan: any) => (
                <div
                  key={loan.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{loan.borrowers?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${Number(loan.principal).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      loan.status === "cleared"
                        ? "default"
                        : loan.status === "active"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {loan.status.replace("_", " ")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">No loans yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
