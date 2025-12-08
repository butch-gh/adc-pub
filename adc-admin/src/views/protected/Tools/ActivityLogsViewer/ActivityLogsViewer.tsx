import React, { useEffect, useState } from "react";
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TextField,
  useTheme,
  Checkbox,
  Divider,
  Box,
  TextareaAutosize,
  Typography,
  Stack,
} from "@mui/material";
import useGet from "services/hooks/useGet";
import dayjs, { Dayjs } from "dayjs";
import LogDetailsView from "./LogDetailsView";

type Log = {
    log_id: number;
    user_id: number;
    username: string;
    action: string;
    module: string;
    ip_address: string;
    details: any;
    created_at: Date;
}

const ActivityLogsViewer = () => {
    const [logData, setLogData] = useState<Log[]>([])
    const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
    //const [selectedDetail, setSelectedDetail] = useState(null);
    const theme = useTheme();

    const {data, refetch, isFetching, isFetched, isLoading} = useGet({
        endpoint: 'logs/getall', 
        param: {},
        querykey: 'get-activity-list',        
      });


      useEffect(()=>{

        if (data) {
            setLogData(data);
            //console.log('activitylogdata:', data)
        }
      },[data])

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(()=>{
    if (searchQuery) {
      setSelectedRowId(null);  
    }    
  },[searchQuery])

  // Filter logs based on search query
  const filteredLogs = logData.filter(
    (log) =>
      log.username?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss').toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {    
    console.log('newSelected', id)            
    setSelectedRowId(id);
  };




  return (
    <Paper component={Stack} elevation={3} style={{ padding: "8px" }} gap={1}>      
      <Typography variant="h5" sx={{ marginX: 1 }}>
      Activity Logs Viewer
      </Typography>
      <TextField
        label="Search logs"
        variant="outlined"
        fullWidth
        margin="normal"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <TableContainer component={Paper} style={{ maxHeight: 430 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
            <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], 
                      color: theme.palette.text.primary,
                      }}>Select</TableCell>
              <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">ID</TableCell>              
              <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">User ID</TableCell>
              <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">User Name</TableCell>
              <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Action</TableCell>
              <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Module</TableCell>
              <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">Created At</TableCell>
              <TableCell sx={{backgroundColor: theme.palette.mode === 'dark' ? '#2E2E2E' : theme.palette.grey[300], color: theme.palette.text.primary}} align="left">IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log, index) => (
              <TableRow key={log.log_id}
                    hover
                    onClick={(event) => handleClick(event, log.log_id)}>
                <TableCell sx={{
                      backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', 
                      color: theme.palette.text.primary,
                      }} padding="checkbox">
                      <Checkbox                        
                        checked={selectedRowId === log.log_id}
                        onChange={() => setSelectedRowId(log.log_id)}
                        inputProps={{ 'aria-labelledby': `checkbox-${log.log_id}` }}
                        sx={{
                          color: theme.palette.mode === 'dark' ? '#0fb491' : '#000000',
                          '&.Mui-checked': {
                            color: '#0fb491',
                          },
                        }}
                      />
                </TableCell> 
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{log.log_id}</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{log.user_id}</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{log.username}</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{log.action}</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{log.module}</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                <TableCell sx={{ backgroundColor: theme.palette.mode === 'dark' ? (index % 2 === 0 ? '#4E4E4E' : '#616161') : 'default', color: theme.palette.text.primary}} align="left">{log.ip_address}</TableCell>
              </TableRow>
            ))}
            {filteredLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box
      sx={{
        padding: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      }}
    >
      <Typography variant="subtitle1" sx={{ marginBottom: 1 }}>
        Details
      </Typography>
      {selectedRowId ? (
        <Stack gap={2}>
          <LogDetailsView log={filteredLogs.find((f) => f.log_id === selectedRowId)!}/>
          {/* <Divider/> */}
          <TextareaAutosize
            minRows={5}
            style={{
              width: "100%",
              padding: "10px",
              fontFamily: "monospace",
              fontSize: "14px",
              backgroundColor: theme.palette.background.default,
              color: theme.palette.text.primary,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
            }}
            value={JSON.stringify(
              filteredLogs.find((f) => f.log_id === selectedRowId),
              null,
              2
            )}
            readOnly
          />    
        </Stack>
        
      ) : (
        <Typography variant="body2" color="text.secondary">
          Select an item to view details.
        </Typography>
      )}
    </Box>


    </Paper>
  );
};

export default ActivityLogsViewer;
