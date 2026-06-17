type Props = {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
};

export default function KPICard({ label, value, sub, trend }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-white text-2xl font-semibold">{value}</p>
      {sub && (
        <p
          className={`text-xs mt-1 ${
            trend === "up"
              ? "text-emerald-400"
              : trend === "down"
              ? "text-red-400"
              : "text-zinc-500"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
