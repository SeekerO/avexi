/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { SetStateAction } from "react";
import SearchBar from "@/lib/components/searchbar";
const BASIS = ({
    open,
    filteredDataEval,
    setSearchDataSetEvaluated,
    searchDataSetEvaluated,
}: {
    open: boolean;
    filteredDataEval: any;
    setSearchDataSetEvaluated: React.Dispatch<SetStateAction<string>>;
    searchDataSetEvaluated: string;
}) => {
    if (!open) return null;
    return (
        <div className="bg-slate-500 w-full h-[60vh] overflow-y-auto overflow-x-hidden">
            <div className="px-2 pt-2 flex items-center gap-2">
                <div className="p-2 rounded-md">{filteredDataEval.length}</div>
                <SearchBar
                    searchText={searchDataSetEvaluated}
                    searchSetter={setSearchDataSetEvaluated}
                />
            </div>
            {filteredDataEval.map((value: any, index: number) => (
                <div
                    key={index}
                    className="text-[0.9rem] items-center flex p-2 gap-2 border-b text-slate-900 border-slate-900 justify-between"
                >
                    <div className="font-semibold text-white">{value.FULLNAME}</div>
                    <div className="w-[100px] bg-slate-100 text-black shrink-0 font-semibold flex items-center justify-center py-1 rounded-md shadow-md">
                        {value.REGION}
                    </div>
                </div>
            ))}
        </div>
    );
};


export default BASIS;
