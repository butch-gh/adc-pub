import React, { useEffect, useState } from 'react';
import { Stack, Card, CardContent, Typography, Button, useTheme, Link } from '@mui/material';
import { useSprings, animated } from '@react-spring/web'; // Use `useSprings` for multiple items
import useGet from 'services/hooks/useGet';

interface Stat {
  label: string;
  count: string | number;
}

interface StatCounts {
  patient_count: string | number;
  confirmed_count: string | number;
  pending_count: string | number;
}

const StatsCard: React.FC = () => {
  const [statsData, setStatsData] = useState<StatCounts>();
  const theme = useTheme();

  const { data } = useGet({
    endpoint: 'dashboard/getstats',
    param: {},
    querykey: 'get-stats-counts',
  });

  useEffect(() => {
    if (data) {
      setStatsData(data);
    }
  }, [data]);

  const statsArray = statsData
    ? [
        { redirect: '/patient', label: 'PATIENTS', count: Number(statsData.patient_count) },
        { redirect: '/appointment', label: 'CONFIRMED APPOINTMENTS', count: Number(statsData.confirmed_count) },
        { redirect: '/appointment', label: 'PENDING APPOINTMENT REQUESTS', count: Number(statsData.pending_count) },
      ]
    : [];

  const springs = useSprings(
    statsArray.length,
    statsArray.map((stat, index) => ({
      from: { value: 0 },
      to: { value: stat.count },
      delay: 200 * index,
      config: { duration: 1000 },
    }))
  );

  const handleDetails = (redirect: string) => {
    window.location.href = redirect;
  };

  return (
    <Stack direction="row" spacing={2} marginTop={2}>
      {statsArray.map((stat, index) => (
        <Card key={index} sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h4" color="primary" gutterBottom>
              <animated.span>
                {springs[index].value.to((val) => Math.floor(val))}
              </animated.span>
            </Typography>
            <Typography variant="body1">{stat.label}</Typography>
            
            <Link
              component="button"
              onClick={() => handleDetails(stat.redirect)} // Handles navigation
              underline="hover" // Adds underline on hover
              sx={{
                display: 'inline-flex', // Ensures proper alignment with the icon
                alignItems: 'center',
                textTransform: 'none',
                color: theme.palette.mode==='dark' ? '#81d4fa' : '#00bcd4',                
                fontSize: '0.875rem', // Matches small button text size
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline', // Emphasize hover state
                },
              }}
            >
              More Details 
              <i
                className="fas fa-arrow-right"
                style={{ marginLeft: '8px', fontSize: '0.75rem' }} // Adjust spacing and icon size
              />
            </Link>


          </CardContent>
        </Card>
      ))}
    </Stack>
  );
};

export default StatsCard;
