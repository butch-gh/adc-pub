import dayjs from "dayjs";
import { Card, CardContent } from "@/components/ui/card";

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

interface Props {
  log: Log;
}

export default function LogDetailsView({ log }: Props) {
  if (!log) {
    return (
      <p className="text-sm text-muted-foreground">
        No log selected.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Log ID:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{log.log_id}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">User ID:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{log.user_id}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Username:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{log.username || "N/A"}</p>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Action:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{log.action}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Module:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{log.module}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">IP Address:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{log.ip_address}</p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Created At:</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {dayjs(log.created_at).format("YYYY-MM-DD HH:mm:ss")}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Details:</p>
              <div className="text-sm text-gray-900 dark:text-gray-100 space-y-1">
                <p><strong>Status:</strong> {log.details.status}</p>
                <p><strong>Description:</strong> {log.details.description}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
