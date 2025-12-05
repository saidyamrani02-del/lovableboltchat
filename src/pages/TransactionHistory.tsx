import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";

const TransactionHistory = () => {
  const { user } = useAuth();
  const [topups, setTopups] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      // Fetch topups
      const { data: topupData } = await supabase
        .from('topup_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      setTopups(topupData || []);

      // Fetch withdrawals
      const { data: withdrawData } = await supabase
        .from('withdraw_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      setWithdrawals(withdrawData || []);

      // Fetch earnings
      const { data: earningData } = await supabase
        .from('earning_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      setEarnings(earningData || []);

      // Fetch subscription payments
      const { data: subData } = await supabase
        .from('subscription_payments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      setSubscriptions(subData || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Transaction History</h2>

      <Tabs defaultValue="topups" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="topups">Topups</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="topups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-green-500" />
                Topup History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topups.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No topup transactions</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topups.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{t.phone_number}</TableCell>
                        <TableCell className="font-semibold">Tsh {Number(t.amount).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-500" />
                Subscription History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No subscription transactions</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold uppercase">{s.package}</TableCell>
                        <TableCell>{s.phone_number}</TableCell>
                        <TableCell className="font-semibold">Tsh {Number(s.amount).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(s.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-blue-500" />
                Withdrawal History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No withdrawal transactions</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>{new Date(w.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{w.phone_number}</TableCell>
                        <TableCell className="font-semibold">Tsh {Number(w.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-red-500">-Tsh {Number(w.fee).toLocaleString()}</TableCell>
                        <TableCell className="text-green-500 font-semibold">Tsh {Number(w.net_amount).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(w.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Earning History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {earnings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No earnings yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Caller</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{new Date(e.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{e.caller_name}</TableCell>
                        <TableCell>{e.duration_minutes} min</TableCell>
                        <TableCell className="font-semibold text-green-600">+Tsh {Number(e.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransactionHistory;
