"use client"
/* eslint-disable @typescript-eslint/no-explicit-any */


import DynamicColumn from "./component/dynamicColumn";

const Remarks = () => {

  return <div className="h-screen w-screen flex flex-col ">

    <div className="p-5 h-full w-full">
      <DynamicColumn />
    </div>
  </div>
};

export default Remarks;
