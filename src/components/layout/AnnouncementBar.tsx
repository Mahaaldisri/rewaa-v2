import { Icon, type IconName } from "@/components/ui/Icon";
import { shipping, whatsappLink } from "@/config/site";
import { formatMoney } from "@/lib/format";

/** Store-wide notes — every line must be true of the configured store data. */
const ITEMS: { icon: IconName; text: string }[] = [
  { icon: "truck", text: `شحن مجاني للطلبات فوق ${formatMoney(shipping.freeShippingThreshold)}` },
  { icon: "rotate", text: "باقات صيانة سنوية بخيارات تشمل قطع الاستبدال" },
  { icon: "card", text: "قسّمها على 4 دفعات بدون فوائد مع تابي وتمارا" },
  { icon: "card", text: "الدفع عند الاستلام متاح" },
  { icon: "store", text: "إمكانية الاستلام من المعارض" },
  { icon: "headset", text: "دعم فني على واتساب خلال أوقات العمل" },
];

/** Infinite marquee of store-wide value props (pauses on hover / reduced motion). */
export function AnnouncementBar() {
  const row = (
    <div className="flex shrink-0 items-center gap-10 pe-10">
      {ITEMS.map((item) => (
        <a
          key={item.text}
          href={item.text.includes("واتساب") ? whatsappLink() : undefined}
          target={item.text.includes("واتساب") ? "_blank" : undefined}
          rel={item.text.includes("واتساب") ? "noopener noreferrer" : undefined}
          className="flex items-center gap-2 whitespace-nowrap text-[12px] font-medium"
        >
          <Icon name={item.icon} size={14} className="text-aqua-300" />
          {item.text}
        </a>
      ))}
    </div>
  );

  return (
    <div className="relative overflow-hidden bg-ink-950 text-ink-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_120px_at_20%_0%,rgba(192,145,47,0.22),transparent_70%)]" />
      <div className="group relative flex overflow-hidden py-2">
        <div className="marquee-track flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          {row}
          {row}
        </div>
      </div>
    </div>
  );
}
