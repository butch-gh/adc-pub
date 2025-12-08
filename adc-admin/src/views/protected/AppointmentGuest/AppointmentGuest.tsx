import React, { useState } from 'react';
import './AppointmentGuest.css';
import DataTable from './table';

const AppointmentGuest: React.FC = () => {
  const [globalID, setGlobalID] = useState(0);

  const updateAppointmentID = (Id: number) => {
    setGlobalID(Id);
  };

  return (
    <div className="container">
      <div className="wrapper">
        <DataTable updateAppointmentID={updateAppointmentID} />
        {/* <FormTabs globalID={globalID}></FormTabs> */}
      </div>
    </div>
  );
}

export default AppointmentGuest;
