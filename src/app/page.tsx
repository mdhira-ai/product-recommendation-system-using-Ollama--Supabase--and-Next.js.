'use client'
import { ProductList, RecommendationList } from "@/components/Mycom";
import { useState } from "react";

const page = () => {

  const [selectId, setSelectId] = useState<any>()

  return (
    <div>
      <ProductList
        onSelectProduct={(productId: any) => {
          setSelectId(productId);
        }}
      />

      <RecommendationList productId={selectId} />
    </div>
  );
}

export default page;