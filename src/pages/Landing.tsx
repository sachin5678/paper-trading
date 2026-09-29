import { Link } from "react-router-dom"
import { TickerRibbon } from "../components/TickerRibbon"
import { Panel } from "../components/Panel"
import { PnlPercent } from "../components/PnlText"
import { formatNumber } from "../lib/format"
import { UNDERLYINGS, buildOptionChain, upcomingExpiries } from "../lib/marketData"
import { useLiveTicks } from "../lib/useLiveTicks"

const PREVIEW_EXPIRY = upcomingExpiries(1)[0]

export default function Landing() {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <TickerRibbon />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="font-mono text-lg font-semibold tracking-tight text-[var(--color-amber)]">
          पैसा<span className="text-[var(--color-text)]">Paper</span>
        </span>
        <Link
          to="/app"
          className="min-h-9 border border-[var(--color-border-strong)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:border-[var(--color-amber)] hover:text-[var(--color-amber)]"
        >
          Open terminal
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <section className="grid gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-16">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-paper)]">
              Simulated NSE &amp; BSE F&amp;O
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--color-text)] sm:text-5xl">
              Trade options on NIFTY and SENSEX without spending a rupee.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-dim)]">
              Paisa Paper gives you a live-feeling option chain, real lot sizes and strike intervals, and{" "}
              <span className="text-[var(--color-text)]">₹10,00,000</span> in virtual capital — so you can learn how
              F&amp;O actually trades before a single rupee is at risk.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                to="/app"
                className="min-h-12 bg-[var(--color-amber)] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black hover:brightness-110"
              >
                Start paper trading
              </Link>
              <p className="text-xs text-[var(--color-text-faint)]">No signup. No card. No real money, ever.</p>
            </div>
          </div>

          <ChainPreview />
        </section>

        <section className="border-t border-[var(--color-border)] py-10">
          <Panel padded={false}>
            <div className="grid divide-y divide-[var(--color-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <SpecItem
                eyebrow="Option chain"
                claim="Modeled on real NSE & BSE quotes"
                body="Strikes, open interest and IV built the way NIFTY, BANKNIFTY and SENSEX contracts actually quote — not a generic simulator."
              />
              <SpecItem
                eyebrow="Starting capital"
                claim="₹10,00,000 virtual"
                body="Every account opens with ten lakh in play money. Reset it in one tap and start fresh whenever you want."
              />
              <SpecItem
                eyebrow="Settlement"
                claim="Zero real-money risk"
                body="Every fill is simulated. Nothing here ever touches a real broker, exchange or bank account."
              />
            </div>
          </Panel>
        </section>

        <section className="border-t border-[var(--color-border)] py-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-text-faint)]">
            How it works
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <Step n={1} title="Get your virtual capital" body="Every account opens with ₹10,00,000 in play money — no funding step, no waiting." />
            <Step n={2} title="Trade the chain" body="Pick NIFTY, BANKNIFTY or SENSEX, choose a strike and expiry, then place a buy or sell." />
            <Step n={3} title="Track your P&L" body="Watch positions mark to the live simulated price and learn from every fill you make." />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] px-4 py-6">
        <p className="mx-auto max-w-6xl text-center text-[11px] leading-relaxed text-[var(--color-text-faint)]">
          All prices, quotes and fills on this site are simulated for practice and do not represent real NSE or BSE
          market data. Paisa Paper is not a broker and does not execute real trades.
        </p>
      </footer>
    </div>
  )
}

function ChainPreview() {
  const [underlying] = useLiveTicks([UNDERLYINGS[0]], 2400)
  const chain = buildOptionChain(underlying, PREVIEW_EXPIRY, 4)

  return (
    <Panel eyebrow={`${underlying.symbol} · ${PREVIEW_EXPIRY}`} title="Live option chain" padded={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[10px] uppercase tracking-wide text-[var(--color-text-faint)]">
              <th className="px-3 py-2">CE LTP</th>
              <th className="px-3 py-2 text-center">Strike</th>
              <th className="px-3 py-2 text-left">PE LTP</th>
            </tr>
          </thead>
          <tbody>
            {chain.map((row) => {
              const isAtm = Math.abs(row.strike - underlying.ltp) < underlying.strikeStep / 2
              return (
                <tr key={row.strike} className={isAtm ? "bg-[var(--color-amber-soft)]" : ""}>
                  <td className="px-3 py-2 font-mono font-tabular text-[var(--color-up)]">
                    {formatNumber(row.call.ltp, 2)}
                  </td>
                  <td
                    className="px-3 py-2 text-center font-mono font-tabular font-semibold"
                    style={{ color: isAtm ? "var(--color-amber)" : "var(--color-text)" }}
                  >
                    {formatNumber(row.strike)}
                  </td>
                  <td className="px-3 py-2 text-left font-mono font-tabular text-[var(--color-down)]">
                    {formatNumber(row.put.ltp, 2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-text-faint)]">
        <span>Spot {formatNumber(underlying.ltp, 2)}</span>
        <PnlPercent value={((underlying.ltp - underlying.prevClose) / underlying.prevClose) * 100} />
      </div>
    </Panel>
  )
}

function SpecItem({ eyebrow, claim, body }: { eyebrow: string; claim: string; body: string }) {
  return (
    <div className="p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-faint)]">{eyebrow}</p>
      <p className="mt-2 text-base font-semibold text-[var(--color-text)]">{claim}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-dim)]">{body}</p>
    </div>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono text-sm text-[var(--color-text-faint)]">{String(n).padStart(2, "0")}</span>
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-dim)]">{body}</p>
      </div>
    </div>
  )
}
