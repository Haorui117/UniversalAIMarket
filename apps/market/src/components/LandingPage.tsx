"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Globe,
  Handshake,
  Route,
  Scan,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Terminal,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CrossChainFlow } from "./CrossChainFlow";
import { ExplosiveTitle, type ExplosiveTitleHandle } from "./ExplosiveTitle";

const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];
const easeInOut: [number, number, number, number] = [0.42, 0, 0.58, 1];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
};

const stats = [
  { label: "智能体接口", value: "发现 + 鉴权 + 工具" },
  { label: "结算", value: "ZetaChain Universal Apps" },
  { label: "协商", value: "买方与卖方智能体" },
  { label: "流式", value: "SSE 结算流" },
];

const pillars = [
  {
    title: "意图引擎",
    desc: "把自然语言转为结构化订单，并附带预算与约束。",
    icon: Bot,
    accent: "text-[var(--landing-accent)]",
  },
  {
    title: "协商中枢",
    desc: "多智能体博弈，寻找最优价格、条款与时机。",
    icon: Handshake,
    accent: "text-[var(--landing-accent)]",
  },
  {
    title: "通用结算",
    desc: "由 ZetaChain Universal Apps 与托管流程驱动的跨链执行。",
    icon: Globe,
    accent: "text-[var(--landing-accent-highlight)]",
  },
];

const endpoints = [
  {
    method: "GET",
    path: "/.well-known/universal-ai-market.json",
    desc: "智能体发现清单",
    tone: "text-[var(--landing-accent)]",
  },
  {
    method: "POST",
    path: "/api/auth/challenge",
    desc: "EIP-191 挑战",
    tone: "text-[var(--landing-accent-secondary)]",
  },
  {
    method: "POST",
    path: "/api/auth/verify",
    desc: "签名验证",
    tone: "text-[var(--landing-accent-secondary)]",
  },
  {
    method: "GET/POST",
    path: "/api/agent/tool",
    desc: "工具调用",
    tone: "text-[var(--landing-accent)]",
  },
  {
    method: "GET",
    path: "/api/settle/stream",
    desc: "结算 SSE",
    tone: "text-[var(--landing-accent-highlight)]",
  },
];

const steps = [
  {
    step: "01",
    title: "发现",
    desc: "获取市场清单与能力集。",
    icon: Scan,
  },
  {
    step: "02",
    title: "鉴权",
    desc: "签一次挑战消息，即可安全交易。",
    icon: ShieldCheck,
  },
  {
    step: "03",
    title: "协商",
    desc: "买卖智能体持续报价直至满足意图。",
    icon: Handshake,
  },
  {
    step: "04",
    title: "结算",
    desc: "跨链路由资产并托管，回执透明。",
    icon: Route,
  },
];

const comparisons = [
  {
    title: "人工结算",
    desc: "传统流程迫使人类处理每个跳转。",
    bullets: [
      "跨链桥与兑换需要人工决策。",
      "人工沟通与议价。",
      "结算延迟，回执分散。",
    ],
    tone: "border-[#b9bbad]/30 text-[#d5d8cc]",
  },
  {
    title: "智能体闭环",
    desc: "只需一次意图，智能体完成重活。",
    bullets: [
      "Universal Apps 自动路由与托管。",
      "对接卖方智能体持续竞价。",
      "结算事件流式可审计。",
    ],
    tone: "border-[#a8b060]/30 text-[#c5d080]",
  },
];

export function LandingPage() {
  const [introReady, setIntroReady] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [waitingForTop, setWaitingForTop] = useState(false);
  const titleRef = useRef<ExplosiveTitleHandle | null>(null);
  const touchStartY = useRef<number | null>(null);
  const hasCheckedScroll = useRef(false);
  const lastIntroReplayAt = useRef(0);
  const audioArmedRef = useRef(false);

  // Check initial scroll position on mount
  useEffect(() => {
    if (hasCheckedScroll.current) return;
    hasCheckedScroll.current = true;

    // If scrolled down on load, wait for user to scroll to top.
    // Double-rAF to allow the browser to restore scroll position after refresh.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (window.scrollY > 50) setWaitingForTop(true);
      });
    });
  }, []);

  // When waiting for top and user scrolls to top, allow animation to start
  useEffect(() => {
    if (!waitingForTop) return;

    const handleScroll = () => {
      if (window.scrollY <= 10) {
        setWaitingForTop(false);
        setIntroReady(false);
        setIntroDismissed(false);
        titleRef.current?.reset();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [waitingForTop]);

  // Replay intro when user scrolls back to the very top after dismissing (same page load).
  useEffect(() => {
    if (waitingForTop) return;

    const handleScroll = () => {
      if (!introDismissed) return;
      if (window.scrollY > 10) return;

      const now = performance.now();
      if (now - lastIntroReplayAt.current < 800) return;
      lastIntroReplayAt.current = now;

      setIntroDismissed(false);
      setIntroReady(false);
      titleRef.current?.reset();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [introDismissed, waitingForTop]);

  const armAudio = useCallback(async () => {
    if (!soundEnabled) return;
    if (audioArmedRef.current) return;

    const success = await titleRef.current?.enableAudio();
    if (success) {
      titleRef.current?.setMuted(false);
      audioArmedRef.current = true;
    }
  }, [soundEnabled]);

  // Autoplay audio is blocked until a user gesture; default is "on" and we arm on first gesture.
  useEffect(() => {
    if (!soundEnabled) return;
    if (audioArmedRef.current) return;

    const handleGesture = () => {
      void armAudio();
    };

    window.addEventListener("pointerdown", handleGesture, { once: true, passive: true });
    window.addEventListener("keydown", handleGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleGesture);
      window.removeEventListener("keydown", handleGesture);
    };
  }, [armAudio, soundEnabled]);

  const toggleSound = useCallback(async () => {
    if (soundEnabled) {
      titleRef.current?.setMuted(true);
      setSoundEnabled(false);
      return;
    }

    // Click is a user gesture, so enabling audio here should succeed.
    setSoundEnabled(true);
    await armAudio();
  }, [armAudio, soundEnabled]);

  const scrollToHero = useCallback(() => {
    const nextSection = document.getElementById("hero-content");
    if (nextSection) {
      const startY = window.scrollY;
      const targetY = nextSection.getBoundingClientRect().top + window.scrollY;
      const delta = targetY - startY;
      const duration = 720;
      const start = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = easeOutCubic(t);
        window.scrollTo(0, startY + delta * eased);
        if (t < 1) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    }
  }, []);

  const triggerExit = useCallback(() => {
    if (!introReady || introDismissed || waitingForTop) return;
    setIntroDismissed(true);
    titleRef.current?.disperse();
    scrollToHero();
  }, [introReady, introDismissed, waitingForTop, scrollToHero]);

  // Lock scroll during intro animation
  useEffect(() => {
    if (waitingForTop) {
      document.body.style.overflow = "";
      return;
    }

    if (introDismissed) {
      // Unlock scroll
      document.body.style.overflow = "";
      return;
    }

    // Lock scroll during animation
    document.body.style.overflow = "hidden";

    const handleWheel = (event: WheelEvent) => {
      // Always prevent scroll during intro
      event.preventDefault();
      // Trigger exit only when animation is ready
      if (introReady && event.deltaY > 0) {
        triggerExit();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      // Prevent touch scroll during intro
      if (!introDismissed) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!introReady) return;
      const startY = touchStartY.current;
      const endY = event.changedTouches[0]?.clientY ?? null;
      if (startY !== null && endY !== null && startY - endY > 40) {
        triggerExit();
      }
      touchStartY.current = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [introReady, introDismissed, waitingForTop, triggerExit]);

  // Remove scroll-back-to-top reset to prevent animation replay
  // Animation only plays once per page load

  return (
    <div className="landing-theme relative overflow-hidden bg-[var(--landing-bg)] text-[var(--landing-text)] selection:bg-[rgba(185,187,173,0.45)] selection:text-[#0a0908]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="landing-grid absolute inset-0" />
        <div className="landing-noise absolute inset-0" />
        {/* Warm luxury orbs - Amber + Cream + Gold */}
        <div
          className="landing-orb absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full animate-float-slow"
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(212, 165, 116, 0.5), transparent 60%)",
          }}
        />
        <div
          className="landing-orb absolute bottom-[-20%] right-[-10%] h-[520px] w-[520px] rounded-full animate-float-slower"
          style={{
            background: "radial-gradient(circle at 40% 40%, rgba(201, 149, 108, 0.4), transparent 65%)",
          }}
        />
        <div
          className="landing-orb absolute top-[15%] right-[20%] h-[260px] w-[260px] rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 40%, rgba(232, 213, 163, 0.35), transparent 60%)",
          }}
        />
      </div>

      <ExplosiveTitle ref={titleRef} onComplete={() => setIntroReady(true)} skip={waitingForTop} />

      {/* Sound Toggle Button */}
      <motion.button
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? "关闭音效" : "开启音效"}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/70 backdrop-blur-md transition-all hover:border-white/40 hover:bg-black/60 hover:text-white"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {soundEnabled ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </motion.button>

      <section className="relative z-10 flex min-h-screen items-end justify-center px-6 pb-10 text-center">
        {introReady && !introDismissed && !waitingForTop ? (
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: easeOut }}
          >
            <motion.div
              className="text-[11px] uppercase tracking-[0.35em] text-white/50"
              animate={{ opacity: [0.35, 0.7, 0.35] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: easeInOut }}
            >
              向下探索
            </motion.div>
            <motion.button
              type="button"
              onClick={triggerExit}
              aria-label="向下滚动"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 p-3 text-white/70 backdrop-blur transition hover:border-white/40 hover:text-white"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: easeInOut }}
            >
              <ChevronDown className="h-5 w-5" />
            </motion.button>
          </motion.div>
        ) : null}
      </section>

      <motion.section
        id="hero-content"
        className="relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-start gap-6 px-6 pb-20 pt-16 text-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
      >
        <div className="space-y-6">
          <motion.div
            variants={fadeUpVariants}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[var(--landing-muted)] backdrop-blur-md"
          >
            <Sparkles className="h-4 w-4 text-[var(--landing-accent)]" />
            代理原生市场
          </motion.div>

          <motion.h2
            variants={fadeUpVariants}
            className="font-display text-4xl leading-[1.05] md:text-6xl"
          >
            <span className="glow-keyword">意图</span>直达<span className="glow-keyword">资产</span>，由<span className="glow-keyword-strong">智能体</span>协商完成。
          </motion.h2>

          <motion.p
            variants={fadeUpVariants}
            className="mx-auto max-w-xl text-lg text-[var(--landing-muted)]"
          >
            Universal AI Market 将结构化意图转化为跨链结算。智能体负责发现、议价与托管，你只需掌控目标。
          </motion.p>

          <motion.div variants={fadeUpVariants} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--landing-accent)] px-7 py-4 text-sm font-semibold text-[#0b0f14] transition-transform hover:-translate-y-0.5"
            >
              进入市场 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/.well-known/universal-ai-market.json"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-4 text-sm font-semibold text-[var(--landing-text)] transition-colors hover:border-white/40 backdrop-blur-md"
            >
              智能体清单 <Terminal className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUpVariants}
            className="grid grid-cols-2 gap-4 text-left sm:grid-cols-4 pt-8"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--landing-muted)]">
                  {stat.label}
                </div>
                <div className="mt-2 text-sm font-semibold text-white/90">{stat.value}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <section id="agent-stack" className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center"
        >
          <motion.p
            variants={fadeUpVariants}
            className="text-xs uppercase tracking-[0.4em] text-[var(--landing-muted)]"
          >
            智能体栈
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            className="mt-4 font-display text-3xl md:text-4xl"
          >
            为<span className="glow-keyword-strong">智能体</span>发现、意图与<span className="glow-keyword">结算</span>而生。
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            className="mx-auto mt-4 max-w-2xl text-base text-[var(--landing-muted)]"
          >
            每个界面都为自主智能体设计，同时对人类操作者保持高级质感。
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-12 grid gap-6 md:grid-cols-3"
        >
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                variants={fadeUpVariants}
                whileHover={{ y: -6 }}
                className="rounded-3xl border border-white/10 bg-[var(--landing-card)] p-6"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Icon className={`h-5 w-5 ${pillar.accent}`} />
                </div>
                <h3 className="text-lg font-semibold">{pillar.title}</h3>
                <p className="mt-3 text-sm text-[var(--landing-muted)]">{pillar.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Cross-Chain Flow Section */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="text-center mb-12"
        >
          <motion.p
            variants={fadeUpVariants}
            className="text-xs uppercase tracking-[0.4em] text-[var(--landing-muted)]"
          >
            跨链魔法
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            className="mt-4 font-display text-3xl md:text-4xl"
          >
            一笔签名，<span className="glow-keyword-strong">三链联动</span>。
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            className="mx-auto mt-4 max-w-2xl text-base text-[var(--landing-muted)]"
          >
            买家在 Base 付款，ZetaChain 编排结算，NFT 从 Polygon 自动交付。全程原子化，要么全成功，要么全回滚。
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: easeOut }}
        >
          <CrossChainFlow />
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.p
            variants={fadeUpVariants}
            className="text-xs uppercase tracking-[0.4em] text-[var(--landing-muted)]"
          >
            协议入口
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            className="mt-4 font-display text-3xl md:text-4xl"
          >
            一个清单、一次鉴权、<span className="glow-keyword">所有工具</span>。
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            className="mt-4 text-base text-[var(--landing-muted)]"
          >
            通过简洁的 HTTP + SSE 接口接入你的智能体。市场把发现、鉴权、工具调用与结算作为一等能力提供。
          </motion.p>
          <motion.div
            variants={fadeUpVariants}
            className="mt-8 flex flex-wrap gap-3 text-xs"
          >
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">EIP-191 鉴权</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">智能体工具调用</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">结算 SSE</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">跨链托管</span>
          </motion.div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="rounded-3xl border border-white/10 bg-[var(--landing-card)] p-6"
        >
          <motion.div
            variants={fadeUpVariants}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--landing-muted)]"
          >
            <Terminal className="h-4 w-4" />
            接口
          </motion.div>
          <motion.div variants={fadeUpVariants} className="mt-6 space-y-4">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.path}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${endpoint.tone}`}>
                    {endpoint.method}
                  </span>
                  <span className="font-mono text-xs text-white/80">{endpoint.path}</span>
                </div>
                <span className="text-xs text-[var(--landing-muted)]">{endpoint.desc}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="text-center"
        >
          <motion.p
            variants={fadeUpVariants}
            className="text-xs uppercase tracking-[0.4em] text-[var(--landing-muted)]"
          >
            流程
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            className="mt-4 font-display text-3xl md:text-4xl"
          >
            从<span className="glow-keyword">意图</span>到<span className="glow-keyword">结算</span>的四步流程。
          </motion.h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                variants={fadeUpVariants}
                className="rounded-3xl border border-white/10 bg-[var(--landing-card)] p-6 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-[var(--landing-accent-secondary)]">
                    {step.step}
                  </span>
                  <Icon className="h-5 w-5 text-[var(--landing-accent)]" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm text-[var(--landing-muted)]">{step.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid gap-6 lg:grid-cols-2"
        >
          {comparisons.map((item) => (
            <motion.div
              key={item.title}
              variants={fadeUpVariants}
              className="rounded-3xl border border-white/10 bg-[var(--landing-card)] p-6"
            >
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${item.tone}`}>
                {item.title}
              </div>
              <p className="mt-4 text-sm text-[var(--landing-muted)]">{item.desc}</p>
              <ul className="mt-5 space-y-3 text-sm text-white/70">
                {item.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/40" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[var(--landing-card)] px-8 py-14 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[rgba(178,199,58,0.12)] via-transparent to-[rgba(185,187,173,0.1)]" />
          <motion.p
            variants={fadeUpVariants}
            className="relative text-xs uppercase tracking-[0.4em] text-[var(--landing-muted)]"
          >
            准备部署
          </motion.p>
          <motion.h2
            variants={fadeUpVariants}
            className="relative mt-4 font-display text-3xl md:text-5xl"
          >
            进入<span className="glow-keyword">市场</span>，剩下交给<span className="glow-keyword-strong">智能体</span>。
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            className="relative mx-auto mt-4 max-w-2xl text-base text-[var(--landing-muted)]"
          >
            打开控制台、连接钱包，把协商交给智能体中枢。
          </motion.p>
          <motion.div variants={fadeUpVariants} className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-[#0b0f14] transition-transform hover:-translate-y-0.5"
            >
              进入市场 <ShoppingBag className="h-4 w-4" />
            </Link>
            <Link
              href="/agent"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-sm font-semibold text-[var(--landing-text)] transition-colors hover:border-white/40"
            >
              打开智能体中心 <Wallet className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>

        <div className="mt-12 flex items-center justify-between text-xs text-[var(--landing-muted)]">
          <span>Universal AI Market</span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            为智能体时代而建
          </span>
        </div>
      </section>
    </div>
  );
}
