const fs = require('fs');

let content = fs.readFileSync('src/app/trades/page.tsx', 'utf8');

const tableImports = `import { DataTable } from "@/components/trades/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";`;

content = content.replace('import { useToast } from "@/hooks/use-toast";', tableImports + '\nimport { useToast } from "@/hooks/use-toast";');

const oldTableStr = `<div className="flex-1 overflow-auto rounded-lg border border-border bg-background-secondary hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-muted uppercase bg-background-tertiary/50 border-b border-border sticky top-0">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Symbol</th>
                  <th className="px-6 py-3">Direction</th>
                  <th className="px-6 py-3">Setup</th>
                  <th className="px-6 py-3">Net P&L</th>
                  <th className="px-6 py-3">RR</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-text-muted">No trades found.</td></tr>
                ) : trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-border hover:bg-background-tertiary/20">
                    <td className="px-6 py-4">{format(new Date(trade.trade_date), "MMM dd, yyyy")}</td>
                    <td className="px-6 py-4 font-bold">{trade.symbol}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={trade.direction === 'Long' ? "text-win border-win/30" : "text-loss border-loss/30"}>{trade.direction}</Badge>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-semibold">{trade.strategy || trade.schematic}</span><br/>
                      <span className="text-text-muted">{trade.sub_strategy || trade.entry_event}</span>
                    </td>
                    <td className={\`px-6 py-4 font-mono font-bold \${trade.net_pnl > 0 ? "text-win" : trade.net_pnl < 0 ? "text-loss" : ""}\`}>
                      {trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl)}
                    </td>
                    <td className="px-6 py-4 font-mono">{trade.actual_rr_achieved ? trade.actual_rr_achieved.toFixed(2) : '-'}R</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={getStatusColor(trade.status)}>{trade.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <Link href={\`/trades/\${trade.id}\`}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(trade.id)} className="text-loss hover:text-loss hover:bg-loss/10"><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>`;

const newTableStr = `          <div className="hidden md:block">
            <DataTable 
              data={trades} 
              columns={[
                {
                  accessorKey: "trade_date",
                  header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8 data-[state=open]:bg-accent/10">Date <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
                  cell: ({ row }) => format(new Date(row.getValue("trade_date")), "MMM dd, yyyy"),
                },
                {
                  accessorKey: "symbol",
                  header: "Symbol",
                  cell: ({ row }) => <span className="font-bold">{row.getValue("symbol")}</span>,
                },
                {
                  accessorKey: "direction",
                  header: "Direction",
                  cell: ({ row }) => <Badge variant="outline" className={row.getValue("direction") === 'Long' ? "text-win border-win/30" : "text-loss border-loss/30"}>{row.getValue("direction") as string}</Badge>,
                },
                {
                  accessorKey: "strategy",
                  header: "Setup",
                  cell: ({ row }) => (
                    <div className="text-xs">
                      <span className="font-semibold">{row.original.strategy || row.original.schematic}</span><br/>
                      <span className="text-text-muted">{row.original.sub_strategy || row.original.entry_event}</span>
                    </div>
                  )
                },
                {
                  accessorKey: "net_pnl",
                  header: ({ column }) => <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8">Net P&L <ArrowUpDown className="ml-2 h-4 w-4" /></Button>,
                  cell: ({ row }) => {
                    const val = parseFloat(row.getValue("net_pnl"));
                    return <span className={\`font-mono font-bold \${val > 0 ? "text-win" : val < 0 ? "text-loss" : ""}\`}>{val > 0 ? "+" : ""}{blurMoney(val)}</span>;
                  }
                },
                {
                  accessorKey: "actual_rr_achieved",
                  header: "RR",
                  cell: ({ row }) => <span className="font-mono">{row.getValue("actual_rr_achieved") ? Number(row.getValue("actual_rr_achieved")).toFixed(2) : '-'}R</span>
                },
                {
                  accessorKey: "status",
                  header: "Status",
                  cell: ({ row }) => <Badge variant="outline" className={getStatusColor(row.getValue("status") as string)}>{row.getValue("status") as string}</Badge>
                },
                {
                  id: "actions",
                  cell: ({ row }) => (
                    <div className="flex justify-end gap-2">
                      <Link href={\`/trades/\${row.original.id}\`}><Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button></Link>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)} className="h-8 w-8 text-loss hover:text-loss hover:bg-loss/10"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )
                }
              ]} 
            />
          </div>`;

content = content.replace(oldTableStr, newTableStr);

fs.writeFileSync('src/app/trades/page.tsx', content);

