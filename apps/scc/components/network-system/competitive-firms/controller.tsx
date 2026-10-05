"use client";

import { useState } from "react";
import styled from "styled-components";
import { StockChart, type PricePoint, type StockRow } from "@/components/ui/dashboard/stock/default/dashboard";
import { directedLine, firmNodes, pairedFirmConnections, splitCompetitionEdge } from "./graph";
import { createInitialCompetitiveFirmsSnapshot, firmIds, type CompetitiveFirmsSnapshot, type FirmId } from "./model";
import { useCompetitiveFirmsSocket } from "./use-competitive-firms-socket";

const Page = styled.main`
  position: fixed; inset: 0; overflow: hidden; background: #f2f1ed; color: #11110f;
  font-family: Arial, Helvetica, sans-serif; font-variant-numeric: tabular-nums;
`;
const Switch = styled.div`
  position: absolute; top: 18px; right: 18px; z-index: 5; display: flex; border: 1px solid currentColor; background: #f2f1ed;
  button { border: 0; padding: 8px 10px; background: transparent; color: inherit; font: 500 10px/1 "SFMono-Regular", Consolas, monospace; cursor: pointer; }
  button + button { border-left: 1px solid currentColor; }
  button[aria-pressed="true"] { background: #11110f; color: #f2f1ed; }
`;
const Graph = styled.svg`position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;`;
const Edge = styled.line.attrs<{ $flow: number }>(({ $flow }) => ({ style: { strokeWidth: .6 + Math.min($flow * 18, 2.2), opacity: .32 + Math.min($flow * 7, .58) } }))`
  stroke: #11110f; vector-effect: non-scaling-stroke;
`;
const Dot = styled.circle.attrs<{ $flow: number }>(({ $flow }) => ({ style: { opacity: .2 + Math.min($flow * 12, .8) } }))`fill: #11110f;`;
const Node = styled.div<{ $x: number; $y: number }>`
  position: absolute; left: ${({$x}) => $x * 100}%; top: ${({$y}) => $y * 100}%; width: clamp(92px, 19vmin, 160px); aspect-ratio: 1;
  display: grid; place-content: center; text-align: center; border: 1px solid; border-radius: 50%; background: #f2f1ed; transform: translate(-50%,-50%);
  strong { font-size: clamp(12px, 2vmin, 19px); font-weight: 500; }
  output { margin-top: 7px; font: 400 clamp(22px, 4vmin, 38px)/1 Arial, sans-serif; }
  small { margin-top: 5px; font: 500 clamp(7px, 1vmin, 10px)/1 monospace; }
`;
const Market = styled.section`
  position: absolute; inset: clamp(52px, 8vh, 76px) clamp(12px, 2.5vw, 34px) clamp(12px, 2.5vh, 26px);
  display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); grid-template-rows: repeat(2,minmax(0,1fr)); gap: clamp(8px, 1.5vmin, 16px); background: #000;
`;
const Card = styled.article`
  min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(110px, 32%) minmax(0,1fr); align-items: center; gap: clamp(8px,2vw,24px);
  padding: clamp(14px,2.5vmin,28px); border-radius: 8px; background: #1c1c1e; color: white; overflow: hidden;
`;
const Info = styled.div<{ $positive: boolean }>`
  min-width: 0; h2 { margin: 0; font-size: clamp(16px,2.2vmin,25px); font-weight: 600; white-space: nowrap; }
  p { margin: 5px 0 0; color: #8e8e93; font-size: clamp(10px,1.3vmin,14px); }
  output { display: block; margin-top: clamp(12px,3vh,28px); font-size: clamp(23px,4vmin,42px); font-weight: 600; }
  small { display: block; margin-top: 5px; color: ${({$positive}) => $positive ? "#32d74b" : "#ff453a"}; font-size: clamp(10px,1.3vmin,14px); font-weight: 600; }
`;
const Chart = styled.div`height: 68%; min-height: 74px; min-width: 0; overflow: hidden; border-radius: 6px;`;

function pointAlong(g: {x1:number;y1:number;x2:number;y2:number}, p:number) { return { x:g.x1+(g.x2-g.x1)*p, y:g.y1+(g.y2-g.y1)*p }; }
function MarketCard({ id, snapshot }: { id: FirmId; snapshot: CompetitiveFirmsSnapshot }) {
  const points = snapshot.marketShareHistory[id];
  const series: PricePoint[] = points.map((p) => ({ id:p.id, time:String(p.time), value:p.value*100 }));
  const current = snapshot.marketShares[id] * 100;
  const prior = (points.at(-6)?.value ?? points[0]?.value ?? .25) * 100;
  const change = current - prior; const positive = change >= 0;
  const stock: StockRow = { id:`market-${id}`, symbol:`COMPANY ${id}`, name:"MARKET SHARE", price:`${current.toFixed(2)}%`, change:`${positive?"+":"−"}${Math.abs(change).toFixed(2)} pp`, changeValue:change, series, timeAsOf:String(snapshot.serverTime) };
  return <Card><Info $positive={positive}><h2>{stock.symbol}</h2><p>{stock.name}</p><output>{stock.price}</output><small>{stock.change}</small></Info><Chart><StockChart positive={positive} progress={1} range="1D" series={series} stock={stock} visibleLength={series.length}/></Chart></Card>;
}

export default function CompetitiveFirmsController() {
  const [fallback] = useState(createInitialCompetitiveFirmsSnapshot);
  const [view,setView] = useState<"network"|"market">("network");
  const { state } = useCompetitiveFirmsSocket({ role:"controller" });
  const snapshot = state ?? fallback; const progress=.15+((snapshot.revision%30)/29)*.7;
  return <Page>
    <Switch><button aria-pressed={view==="network"} onPointerDown={()=>setView("network")}>NETWORK</button><button aria-pressed={view==="market"} onPointerDown={()=>setView("market")}>MARKET</button></Switch>
    {view === "network" ? <>
      <Graph viewBox="0 0 1 1" preserveAspectRatio="none"><defs><marker id="customer-arrow" markerHeight="6" markerWidth="6" orient="auto" refX="5" refY="3" viewBox="0 0 6 6"><path d="M0 0L6 3L0 6Z" fill="#11110f"/></marker></defs>
        {pairedFirmConnections.flatMap((pair)=>pair.edgeIds.map((edgeId,index)=>{ const [from,to]=splitCompetitionEdge(edgeId); const g=directedLine(firmNodes[+from-1].point,firmNodes[+to-1].point,index===1); const dot=pointAlong(g,progress); const flow=snapshot.competitionFlows[edgeId]; return <g key={edgeId}><Edge {...g} $flow={flow} markerEnd="url(#customer-arrow)"/><Dot cx={dot.x} cy={dot.y} r=".0045" $flow={flow}/></g>; }))}
      </Graph>
      {firmNodes.map((node)=><Node key={node.id} $x={node.point.x} $y={node.point.y}><strong>{node.label}</strong><output>{(snapshot.marketShares[node.id]*100).toFixed(1)}%</output><small>CUSTOMER SHARE</small></Node>)}
    </> : <Market>{firmIds.map((id)=><MarketCard key={id} id={id} snapshot={snapshot}/>)}</Market>}
  </Page>;
}
