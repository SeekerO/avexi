import React, { SetStateAction } from "react";
import SearchBar from "@/lib/components/searchbar";
import convertExcelTimestamp from "@/lib/util/convertExcelTimestamp";

const MATCH = ({
    open,
    filteredDataSet,
    searchDataSet,
    setSearchDataSet,
}: {
    open: boolean;
    filteredDataSet: any;
    searchDataSet: string;
    setSearchDataSet: React.Dispatch<SetStateAction<string>>;
}) => {
    if (open) return null;
    return (
        <div className="bg-slate-500 w-full h-[60vh] overflow-y-auto overflow-x-hidden">
            <div className="px-2 pt-2 flex items-center gap-2">
                <div className="p-2 rounded-md">{filteredDataSet.length}</div>
                <SearchBar searchText={searchDataSet} searchSetter={setSearchDataSet} />
            </div>
            {filteredDataSet.map((value: any, index: number) => (
                <div
                    key={index}
                    className="text-[0.9rem] items-center flex p-2 gap-2 border-b border-slate-300 justify-between"
                >
                    <div className="font-semibold ">{value.FULLNAME}</div>
                    <div className="w-[100px] bg-slate-100 text-black shrink-0 font-semibold flex items-center justify-center py-1 rounded-md shadow-md">
                        {value.REGION > 4000
                            ? convertExcelTimestamp(value.REGION)
                            : value.REGION}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MATCH;

