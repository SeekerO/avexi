import React from "react";

const SearchBar = ({
    searchText,
    searchSetter,
}: {
    searchText: string;
    searchSetter: React.Dispatch<React.SetStateAction<string>>;
}) => {
    return (
        <div className="h-[30px] w-full bg-slate-100 rounded-md">
            <input
                type="text"
                value={searchText}
                onChange={(e) => searchSetter(e.target.value)}
                placeholder="Search"
                className="w-full h-full bg-transparent px-2 text-black outline-none"
            />
        </div>
    );
};

export default SearchBar;
