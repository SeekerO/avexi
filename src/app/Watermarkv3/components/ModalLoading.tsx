import { AiOutlineLoading } from "react-icons/ai";


const ModalLoading = ({ open }: { open: boolean }) => {
    if (!open) return null
    return <div className="h-[100vh] w-auto absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
        <div className="h-[200px] w-[400px] flex flex-col items-center justify-center bg-white dark:bg-gray-900 shadow-lg shadow-gray-600 dark:shadow-black rounded-lg ">
            <div className="flex items-center gap-2">

                <label className="text-[20px] font-semibold text-gray-800 dark:text-gray-100">
                    Processing images...
                </label>
                <div className="flex relative">
                    <AiOutlineLoading className="animate-spin text-[30px] text-blue-700" />
                </div>
            </div>
        </div>
    </div>
}

export default ModalLoading;