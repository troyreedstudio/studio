import { ReactNode } from "react";

type CustomContainerProps = {
  children: ReactNode;
};

const MyContainer = ({ children }: CustomContainerProps) => {
  return <div className="max-w-[1327px] mx-auto  md:p-5 p-3 ">{children}</div>;
};

export default MyContainer;
