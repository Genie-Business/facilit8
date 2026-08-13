import Image from "next/image";

interface OrbitAvatar {
  photo: string;
  ring: 1 | 2 | 3 | 4;
  angleDeg: number;
  size: 58 | 78 | 88;
  shape: "round" | "square";
  delayS: number;
}

const RING_RADIUS: Record<1 | 2 | 3 | 4, number> = { 1: 176.5, 2: 250.5, 3: 324.5, 4: 398.5 };
const RING_DURATION: Record<1 | 2 | 3 | 4, string> = { 1: "30s", 2: "40s", 3: "50s", 4: "60s" };
const RING_DIRECTION: Record<1 | 2 | 3 | 4, "normal" | "reverse"> = {
  1: "reverse",
  2: "normal",
  3: "normal",
  4: "reverse",
};

const AVATARS: OrbitAvatar[] = [
  { photo: "/marketing/people/photo-1.webp", ring: 1, angleDeg: 270, size: 58, shape: "square", delayS: 0.6 },
  { photo: "/marketing/people/photo-2.webp", ring: 2, angleDeg: 60, size: 58, shape: "round", delayS: 1.0 },
  { photo: "/marketing/people/photo-3.webp", ring: 2, angleDeg: 300, size: 58, shape: "square", delayS: 1.4 },
  { photo: "/marketing/people/photo-4.webp", ring: 3, angleDeg: 130, size: 88, shape: "round", delayS: 1.8 },
  { photo: "/marketing/people/photo-5.webp", ring: 4, angleDeg: 30, size: 58, shape: "round", delayS: 2.1 },
  { photo: "/marketing/people/photo-1.webp", ring: 4, angleDeg: 220, size: 88, shape: "square", delayS: 2.3 },
];

function OrbitRing({ ring }: { ring: 1 | 2 | 3 | 4 }) {
  const diameter = RING_RADIUS[ring] * 2;
  return (
    <div
      className="orbit-ring"
      style={{
        width: diameter,
        height: diameter,
        animationDuration: RING_DURATION[ring],
        animationDirection: RING_DIRECTION[ring],
      }}
    />
  );
}

function OrbitAvatarItem({ avatar }: { avatar: OrbitAvatar }) {
  const radius = RING_RADIUS[avatar.ring];
  return (
    <div
      className="orbit-avatar-wrap"
      style={{
        transform: `translate(-50%, -50%) rotate(${avatar.angleDeg}deg) translate(${radius}px) rotate(${-avatar.angleDeg}deg)`,
      }}
    >
      <div
        className="orbit-avatar-counter"
        style={{
          animationDuration: RING_DURATION[avatar.ring],
          animationDirection: RING_DIRECTION[avatar.ring] === "normal" ? "reverse" : "normal",
        }}
      >
        <div
          className="orbit-avatar-glow orbit-avatar-fly-in"
          style={{
            width: avatar.size,
            height: avatar.size,
            borderRadius: avatar.shape === "round" ? "9999px" : avatar.size >= 88 ? "24px" : "20px",
            animationDelay: `${avatar.delayS}s`,
          }}
        >
          <Image
            src={avatar.photo}
            alt=""
            width={avatar.size}
            height={avatar.size}
            className="size-full object-cover"
            style={{ borderRadius: avatar.shape === "round" ? "9999px" : avatar.size >= 88 ? "24px" : "20px" }}
          />
        </div>
      </div>
    </div>
  );
}

export function HeroOrbit() {
  return (
    <div className="hero-orbit-container">
      <div className="hero-orbit-center">
        <span className="hero-orbit-center-label">Growing</span>
        <span className="hero-orbit-center-sub">Together</span>
      </div>

      <div className="hero-orbit-ring-layer">
        <OrbitRing ring={1} />
      </div>
      <div className="hero-orbit-ring-layer">
        <OrbitRing ring={2} />
      </div>
      <div className="hero-orbit-ring-layer">
        <OrbitRing ring={3} />
      </div>
      <div className="hero-orbit-ring-layer">
        <OrbitRing ring={4} />
      </div>

      <div className="hero-orbit-avatar-layer">
        {AVATARS.map((avatar, i) => (
          <OrbitAvatarItem key={i} avatar={avatar} />
        ))}
      </div>
    </div>
  );
}
