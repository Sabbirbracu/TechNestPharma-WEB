import type { IconType } from "react-icons";
import {
  FaEnvelope,
  FaFax,
  FaLinkedin,
  FaMobileScreen,
  FaPhone,
  FaQrcode,
  FaSkype,
  FaWeixin,
  FaWhatsapp,
} from "react-icons/fa6";
import type { ChannelType } from "@/types/api";

type ChannelMeta = {
  Icon: IconType;
  /** Spoken form of the icon — the only label a screen reader gets. */
  label: string;
  /** Icon colour. Brand channels carry the vendor's own colour so the mark is
   *  recognisable at 14px; the plain telecom routes stay muted. */
  tint: string;
};

/**
 * One icon per channel, using each vendor's own mark. A generic phone glyph on
 * a WhatsApp number, a WeChat ID and a fax line makes three different routes
 * look like one — the icon has to say which app the number belongs to, because
 * that is what decides how the buyer reaches them.
 */
export const CHANNEL_META: Record<ChannelType, ChannelMeta> = {
  email: { Icon: FaEnvelope, label: "Email", tint: "text-muted-foreground/70" },
  phone: { Icon: FaPhone, label: "Landline", tint: "text-muted-foreground/70" },
  mobile: {
    Icon: FaMobileScreen,
    label: "Mobile",
    tint: "text-muted-foreground/70",
  },
  fax: { Icon: FaFax, label: "Fax", tint: "text-muted-foreground/60" },
  whatsapp: {
    Icon: FaWhatsapp,
    label: "WhatsApp",
    tint: "text-[#25D366] dark:text-[#3ddc7f]",
  },
  wechat: {
    Icon: FaWeixin,
    label: "WeChat",
    tint: "text-[#07C160] dark:text-[#2ede86]",
  },
  skype: {
    Icon: FaSkype,
    label: "Skype",
    tint: "text-[#00AFF0] dark:text-[#3fc8ff]",
  },
  linkedin: {
    Icon: FaLinkedin,
    label: "LinkedIn",
    tint: "text-[#0A66C2] dark:text-[#70b5f9]",
  },
  qr_image: {
    Icon: FaQrcode,
    label: "QR code",
    tint: "text-muted-foreground/70",
  },
};

/**
 * `mailto:` / `tel:` / `wa.me` / profile URL where the channel can be opened,
 * otherwise null. Fax and WeChat have nothing to open — a fax number dialled
 * as a voice call reaches a carrier tone, so it stays plain text to copy.
 */
export function hrefForChannel(channel: ChannelType, value: string): string | null {
  if (channel === "email") return `mailto:${value}`;
  if (channel === "phone" || channel === "mobile")
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  if (channel === "whatsapp")
    return `https://wa.me/${value.replace(/[^\d]/g, "")}`;
  if (channel === "skype") return `skype:${value}?chat`;
  if (channel === "linkedin")
    return value.startsWith("http") ? value : `https://www.linkedin.com/in/${value}`;
  return null;
}
