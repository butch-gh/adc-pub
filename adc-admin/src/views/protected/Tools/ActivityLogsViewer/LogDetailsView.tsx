import React from "react";
import { Box, Typography, Paper, Stack } from "@mui/material";
import dayjs from "dayjs";

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

const LogDetailsView = (props: Props) => {
  const { log } = props;

  if (!log) {
    return (
      <Typography variant="body2" color="text.secondary">
        No log selected.
      </Typography>
    );
  }

  return (
    <Paper elevation={2} sx={{ padding: 2 }}>
      {/* <Typography variant="h6" gutterBottom>
        Log Details
      </Typography> */}
      <Box sx={{ display: "flex", gap: 2 }}>
        {/* Column 1 */}
        <Stack spacing={1} flex={1}>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              Log ID:
            </Typography>
            <Typography variant="body2">{log.log_id}</Typography>
          </Box>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              User ID:
            </Typography>
            <Typography variant="body2">{log.user_id}</Typography>
          </Box>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              Username:
            </Typography>
            <Typography variant="body2">{log.username || "N/A"}</Typography>
          </Box>
        </Stack>

        {/* Column 2 */}
        <Stack spacing={1} flex={1}>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              Action:
            </Typography>
            <Typography variant="body2">{log.action}</Typography>
          </Box>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              Module:
            </Typography>
            <Typography variant="body2">{log.module}</Typography>
          </Box>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              IP Address:
            </Typography>
            <Typography variant="body2">{log.ip_address}</Typography>
          </Box>
        </Stack>

        {/* Column 3 */}
        <Stack spacing={1} flex={1}>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              Created At:
            </Typography>
            <Typography variant="body2">{dayjs(log.created_at).format("YYYY-MM-DD HH:mm:ss")}</Typography>
          </Box>
          <Box>
            <Typography variant="body1" fontWeight="bold">
              Details:
            </Typography>
            <Typography variant="body2">
              <strong>Status:</strong> {log.details.status}
            </Typography>
            <Typography variant="body2">
              <strong>Description:</strong> {log.details.description}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};

export default LogDetailsView;



// import React from "react";
// import { Box, Typography, Grid, Paper } from "@mui/material";
// import dayjs from "dayjs";

// type Log = {
//     log_id: number;
//     user_id: number;
//     username: string;
//     action: string;
//     module: string;
//     ip_address: string;
//     details: any;
//     created_at: Date;
// }

// interface Props {
//     log : Log;
// }

// const LogDetailsView = ( props : Props) => {
//     const {log} = props;
//   if (!log) {
//     return (
//       <Typography variant="body2" color="text.secondary">
//         No log selected.
//       </Typography>
//     );
//   }

//   return (
//     <Paper elevation={2} sx={{ padding: 3 }}>
//       <Typography variant="h6" gutterBottom>
//         Log Details
//       </Typography>
//       <Grid container spacing={2}>
//         <Grid item xs={12} sm={6}>
//           <Typography variant="body1" fontWeight="bold">
//             Log ID:
//           </Typography>
//           <Typography variant="body2">{log.log_id}</Typography>
//         </Grid>
//         <Grid item xs={12} sm={6}>
//           <Typography variant="body1" fontWeight="bold">
//             User ID:
//           </Typography>
//           <Typography variant="body2">{log.user_id}</Typography>
//         </Grid>
//         <Grid item xs={12} sm={6}>
//           <Typography variant="body1" fontWeight="bold">
//             Username:
//           </Typography>
//           <Typography variant="body2">
//             {log.username || "N/A"}
//           </Typography>
//         </Grid>
//         <Grid item xs={12} sm={6}>
//           <Typography variant="body1" fontWeight="bold">
//             Action:
//           </Typography>
//           <Typography variant="body2">{log.action}</Typography>
//         </Grid>
//         <Grid item xs={12} sm={6}>
//           <Typography variant="body1" fontWeight="bold">
//             Module:
//           </Typography>
//           <Typography variant="body2">{log.module}</Typography>
//         </Grid>
//         <Grid item xs={12} sm={6}>
//           <Typography variant="body1" fontWeight="bold">
//             IP Address:
//           </Typography>
//           <Typography variant="body2">{log.ip_address}</Typography>
//         </Grid>
//         <Grid item xs={12} sm={6}>
//           <Typography variant="body1" fontWeight="bold">
//             Created At:
//           </Typography>
//           <Typography variant="body2">{dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}</Typography>
//         </Grid>
//         <Grid item xs={12}>
//           <Typography variant="body1" fontWeight="bold">
//             Details:
//           </Typography>
//           <Typography variant="body2">
//             <strong>Status:</strong> {log.details.status}
//           </Typography>
//           <Typography variant="body2">
//             <strong>Description:</strong> {log.details.description}
//           </Typography>
//         </Grid>
//       </Grid>
//     </Paper>
//   );
// };
// export default LogDetailsView;