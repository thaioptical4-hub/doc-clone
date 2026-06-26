interface TabBarProps {
  active: "send" | "receive"
  onChange: (tab: "send" | "receive") => void
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="tab-bar">
      <button className={active === "send" ? "active" : ""} onClick={() => onChange("send")}>
        Send
      </button>
      <button className={active === "receive" ? "active" : ""} onClick={() => onChange("receive")}>
        Receive
      </button>
    </div>
  )
}
