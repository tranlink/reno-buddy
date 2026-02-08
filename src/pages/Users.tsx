import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Users as UsersIcon, Loader2 } from "lucide-react";

interface AppUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        const res = await supabase.functions.invoke("list-users");
        if (res.error) {
          setError(res.error.message);
        } else {
          setUsers(res.data.users || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UsersIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Registered Users</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Last Sign In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      {u.email_confirmed_at ? (
                        <Badge variant="default" className="text-xs">Confirmed</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(u.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.last_sign_in_at
                        ? format(new Date(u.last_sign_in_at), "MMM d, yyyy HH:mm")
                        : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
