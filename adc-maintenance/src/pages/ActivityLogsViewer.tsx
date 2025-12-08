import { useEffect, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import dayjs from "dayjs";
import LogDetailsView from './LogDetailsView';
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

type Log = {
  log_id: number;
  user_id: number;
  username: string | null;
  action: string;
  module: string;
  ip_address: string;
  details: {
    status: string;
    description: string;
  };
  created_at: Date;
};

export function ActivityLogsViewer() {
  const [logData, setLogData] = useState<Log[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ['get-activity-list'],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/maintenance/logs/getall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const result = await response.json();      
      return result;
    },
  });

  useEffect(() => {
    if (data) {                
      setLogData(data);
    }
  }, [data]);

  useEffect(() => {
    if (searchQuery) {
      setSelectedRowId(null);
    }
  }, [searchQuery]);

  // Filter logs based on search query
  const filteredLogs = logData.filter(
    (log) =>
      log.username?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss').toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClick = (id: number) => {
    setSelectedRowId(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity Logs Viewer</h2>
        <p className="text-muted-foreground">View and search system activity logs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Logs</CardTitle>
          <CardDescription>
            <Input
              placeholder="Search logs by username, action, module, date, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
            />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[430px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-muted">
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>User Name</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow
                      key={log.log_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleClick(log.log_id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRowId === log.log_id}
                          onCheckedChange={() => setSelectedRowId(log.log_id)}
                        />
                      </TableCell>
                      <TableCell>{log.log_id}</TableCell>
                      <TableCell>{log.user_id}</TableCell>
                      <TableCell>{log.username || 'N/A'}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.module}</TableCell>
                      <TableCell>{dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                      <TableCell>{log.ip_address}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedRowId ? (
            <div className="space-y-4">
              <LogDetailsView log={filteredLogs.find((f) => f.log_id === selectedRowId)!} />
              <div className="mt-4">
                <label className="text-sm font-medium">Raw JSON Data</label>
                <textarea
                  className="w-full mt-2 p-3 font-mono text-sm bg-muted border rounded-md min-h-[150px]"
                  value={JSON.stringify(
                    filteredLogs.find((f) => f.log_id === selectedRowId),
                    null,
                    2
                  )}
                  readOnly
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select an item to view details.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
