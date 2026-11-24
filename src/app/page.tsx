import { Preloader } from "@/components/home/Preloader";
import { HeroReveal, Assembly, MiniStudio, MaterialWall, ExclusiveTeaser, ProofStrip, SampleCTA, ShowroomsStrip } from "@/components/home/HomeSections";

export default function Home() {
  return (
    <>
      <Preloader />
      <HeroReveal />
      <ProofStrip />
      <Assembly />
      <MiniStudio />
      <MaterialWall />
      <ExclusiveTeaser />
      <SampleCTA />
      <ShowroomsStrip />
    </>
  );
}
