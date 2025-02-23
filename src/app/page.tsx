import Image from "next/image";
import kkk from "../lib/image/KKK.png"
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-slate-300">
      <div className=" flex flex-col justify-center items-center h-fit w-fit ">
        <Image src={kkk} alt="Description of image" width={500} height={500} className="-mt-40" />
        <div className="flex gap-5 mt-4">
          <Link href={"/Remarks"} className="bg-blue-900 font-semibold px-10 py-3 rounded-md hover:scale-110 duration-300" >REMARKS</Link>
          <Link href={"/Evaluation"} className="bg-blue-900 font-semibold px-10 py-3 rounded-md hover:scale-110 duration-300">EVALUATION</Link>
        </div>
      </div>
    </div>
  );
}
