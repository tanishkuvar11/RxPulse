import { useState } from "react";

interface PatientCompanionViewProps {
  drug: string;
  missedGapDays: number;
  refilledDaysBeforeVisit: number;
  clinicSystolicBp: number;
}

interface ChatMessage {
  sender: "pharmacist" | "patient";
  text: string;
  time: string;
}

export function PatientCompanionView({
  drug,
  missedGapDays,
  refilledDaysBeforeVisit,
  clinicSystolicBp,
}: PatientCompanionViewProps) {
  // Interactive patient action states
  const [couponClaimed, setCouponClaimed] = useState<boolean>(false);
  const [deliveryRequested, setDeliveryRequested] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: "pharmacist",
      text: "Hi Robert! I'm Pharmacist Elena from your care team. Did you experience any side effects or difficulty picking up your pills recently? I'm here to help whenever you need.",
      time: "9:42 AM",
    },
  ]);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const handleQuickReply = (reason: "dizzy" | "cost" | "travel") => {
    if (selectedChip === reason) return;
    setSelectedChip(reason);

    let patientText = "";
    let pharmacistReply = "";

    if (reason === "dizzy") {
      patientText = "I felt dizzy in the mornings after taking my dose.";
      pharmacistReply =
        "Thank you so much for telling me, Robert! Dizziness is common when blood pressure medication is taken on an empty stomach. I just notified Dr. Jenkins to adjust your dosing schedule so you stay safe and comfortable.";
    } else if (reason === "cost") {
      patientText = "The co-pay was more than I could afford this month.";
      pharmacistReply =
        "I completely understand, Robert. Nobody should have to choose between their health and their budget. I just activated a co-pay assistance voucher for you to bring the cost down.";
    } else {
      patientText = "I was traveling out of state and forgot my bottle at home.";
      pharmacistReply =
        "That happens to all of us! Whenever you travel, our CarePulse app can alert any nearby pharmacy for a courtesy 5-day emergency supply. Safe travels!";
    }

    setChatMessages((prev) => [
      ...prev,
      { sender: "patient", text: patientText, time: "9:45 AM" },
      { sender: "pharmacist", text: pharmacistReply, time: "9:46 AM" },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Mobile Smartphone Mockup (6 cols) */}
        <div className="lg:col-span-6 flex justify-center">
          {/* Phone Frame */}
          <div className="relative w-full max-w-[360px] rounded-[42px] border-4 border-[#243039] bg-[#0A0E13] p-3.5 shadow-2xl ring-1 ring-white/10">
            {/* Dynamic Island / Top Speaker */}
            <div className="relative mx-auto h-5 w-28 rounded-full bg-[#161E25] flex items-center justify-center mb-2">
              <span className="h-2 w-2 rounded-full bg-[#0E1419]" />
            </div>

            {/* Phone Screen Glass */}
            <div className="rounded-[32px] bg-[#111921] border border-hairline/60 overflow-hidden text-text flex flex-col min-h-[640px]">
              {/* iOS-Style Status Bar */}
              <div className="flex justify-between items-center px-5 pt-2.5 pb-1 text-[11px] font-mono text-subtext">
                <span className="font-semibold text-text">9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">5G</span>
                  <span className="h-2 w-4 rounded-xs border border-subtext flex items-center p-0.5">
                    <span className="h-full w-full bg-emerald-400 rounded-xs" />
                  </span>
                </div>
              </div>

              {/* App Navigation Bar */}
              <div className="border-b border-hairline bg-surface/80 px-4 py-2.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-2 w-2 rounded-full bg-amber" />
                    <span className="text-xs font-bold text-text">CarePulse</span>
                  </div>
                  <span className="text-[10px] text-subtext">Companion by Vanishing Dose</span>
                </div>
                <span className="rounded-full bg-amber/15 border border-amber/30 px-2 py-0.5 text-[9px] font-mono font-semibold text-amber">
                  Patient Mode
                </span>
              </div>

              {/* Phone Content Scrollable Area */}
              <div className="p-4 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {/* Greeting Card */}
                <div className="rounded-xl border border-hairline bg-surface p-3 space-y-1">
                  <span className="text-[11px] text-subtext">Good morning,</span>
                  <h3 className="text-base font-bold text-text">Robert Miller</h3>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-subtext">
                    <span>Prescribed: {drug.split(" ")[0]}</span>
                    <span className="text-amber font-mono">1 pill daily</span>
                  </div>
                </div>

                {/* Non-Accusatory Empathetic Check-in Banner */}
                <div className="rounded-xl border border-amber/30 bg-amber/5 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-amber text-sm font-bold">♥</span>
                    <span className="text-xs font-bold text-amber">Gentle Health Check-In</span>
                  </div>
                  <p className="text-[11px] text-text/90 leading-relaxed">
                    {missedGapDays > 0
                      ? `We noticed your ${drug.split(" ")[0]} refill was delayed by ${missedGapDays} days. Life gets busy and healthcare can be complicated. There is zero judgment here. We are here to help make taking your medicine easy and affordable.`
                      : `You have taken your medication faithfully without gaps! Your blood pressure today was ${clinicSystolicBp}/82 mmHg. Your care team is reviewing your progress.`}
                  </p>
                </div>

                {/* Action Card 1: Co-Pay Assistance Voucher */}
                <div className="rounded-xl border border-hairline bg-surface p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text text-xs">Pharmacy Co-Pay Voucher</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">Concept feature</span>
                  </div>
                  <p className="text-[11px] text-subtext">
                    Reduce your out-of-pocket pharmacy payment this month.
                  </p>
                  <button
                    onClick={() => setCouponClaimed(true)}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer transition-all ${
                      couponClaimed
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-amber text-ground hover:bg-amber/90"
                    }`}
                  >
                    {couponClaimed ? "✓ Voucher Claimed" : "Claim Co-Pay Voucher"}
                  </button>
                </div>

                {/* Action Card 2: Free Home Delivery */}
                <div className="rounded-xl border border-hairline bg-surface p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text text-xs">Free Doorstep Delivery</span>
                    <span className="text-[10px] font-mono text-amber">No Delivery Fee</span>
                  </div>
                  <p className="text-[11px] text-subtext">
                    Skip lines at the pharmacy. Have your 90-day supply delivered to your home.
                  </p>
                  <button
                    onClick={() => setDeliveryRequested(true)}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
                      deliveryRequested
                        ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                        : "border border-hairline bg-ground text-text hover:border-hairline/80 hover:bg-surface"
                    }`}
                  >
                    {deliveryRequested ? "✓ Delivery Scheduled for Thursday" : "Request Free Home Delivery"}
                  </button>
                </div>

                {/* Action Card 3: Direct Pharmacist Chat */}
                <div className="rounded-xl border border-hairline bg-surface p-3 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-hairline pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-text text-xs">Elena (Care Pharmacist)</span>
                    </div>
                    <span className="text-[10px] text-subtext">Online Now</span>
                  </div>

                  {/* Messages Bubble Area */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          msg.sender === "patient" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`rounded-xl px-3 py-2 text-[11px] leading-relaxed max-w-[85%] ${
                            msg.sender === "patient"
                              ? "bg-amber text-ground font-medium rounded-tr-none"
                              : "bg-ground border border-hairline text-text rounded-tl-none"
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-subtext mt-0.5 px-1 font-mono">{msg.time}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick Patient Response Chips */}
                  <div className="pt-2 border-t border-hairline space-y-1.5">
                    <span className="text-[10px] text-subtext font-mono block">Tap to send quick reply:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleQuickReply("dizzy")}
                        className={`rounded-full border px-2.5 py-1 text-[10px] cursor-pointer transition-all ${
                          selectedChip === "dizzy"
                            ? "bg-amber text-ground border-amber font-semibold"
                            : "bg-ground border-hairline text-subtext hover:text-text hover:border-hairline/80"
                        }`}
                      >
                        Felt dizzy
                      </button>
                      <button
                        onClick={() => handleQuickReply("cost")}
                        className={`rounded-full border px-2.5 py-1 text-[10px] cursor-pointer transition-all ${
                          selectedChip === "cost"
                            ? "bg-amber text-ground border-amber font-semibold"
                            : "bg-ground border-hairline text-subtext hover:text-text hover:border-hairline/80"
                        }`}
                      >
                        Cost was too high
                      </button>
                      <button
                        onClick={() => handleQuickReply("travel")}
                        className={`rounded-full border px-2.5 py-1 text-[10px] cursor-pointer transition-all ${
                          selectedChip === "travel"
                            ? "bg-amber text-ground border-amber font-semibold"
                            : "bg-ground border-hairline text-subtext hover:text-text hover:border-hairline/80"
                        }`}
                      >
                        Forgot while traveling
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Why This Wins Round 1 & Commercial Viability (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Design rationale */}
          <div className="rounded-xl border border-amber/40 bg-surface p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber text-ground font-bold text-xs">
                ★
              </span>
              <span className="font-bold uppercase tracking-wider text-text">
                Design rationale
              </span>
            </div>

            <h3 className="text-base font-bold text-text">
              Transforming "Caught Non-Adherence" Into Compassionate Health Support
            </h3>

            <p className="text-xs text-subtext leading-relaxed">
              Most digital health apps treat missed medication as patient misconduct. They send stern notifications or scold patients. Research shows this causes psychological reactance: patients avoid doctor visits or scramble to take pills right before appointments (causing the dangerous white-coat surge).
            </p>

            <div className="rounded-lg border border-hairline bg-ground p-4 space-y-2.5 text-xs">
              <span className="font-semibold text-amber uppercase tracking-wider text-[11px] block">
                The Vanishing Dose Difference:
              </span>
              <ul className="space-y-2 text-subtext">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">1.</span>
                  <span>
                    <strong className="text-text">Non-Punitive Communication:</strong> We never accuse patients. The app normalizes adherence challenges and provides immediate practical solutions.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">2.</span>
                  <span>
                    <strong className="text-text">Automated co-pay subsidies:</strong> out-of-pocket cost is a well-documented driver of missed refills in published adherence research. One-click voucher redemption addresses it directly.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">3.</span>
                  <span>
                    <strong className="text-text">Frictionless home delivery:</strong> removing the physical burden of pharmacy pickup is a concept feature aimed at more consistent medication possession, not a measured outcome in this prototype.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Business rationale -- a hypothesized model, not a measured outcome */}
          <div className="rounded-xl border border-hairline bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text">
                Hypothesized economic rationale
              </h4>
              <span className="text-[11px] font-mono text-subtext font-semibold">Not measured in this prototype</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="rounded-lg border border-hairline bg-ground p-3">
                <span className="text-[10px] text-subtext block">Readmission risk</span>
                <span className="text-sm font-bold text-text">Direction: down</span>
                <p className="text-[10px] text-subtext mt-1">
                  If dangerous dose escalations are avoided, some ER visits from accidental overdose should be
                  preventable. No dollar figure is claimed here.
                </p>
              </div>

              <div className="rounded-lg border border-hairline bg-ground p-3">
                <span className="text-[10px] text-subtext block">Medication possession</span>
                <span className="text-sm font-bold text-text">Direction: up</span>
                <p className="text-[10px] text-subtext mt-1">
                  Lower-friction refills and delivery are hypothesized to help, based on general adherence
                  literature, not on data collected by this prototype.
                </p>
              </div>
            </div>

            <p className="text-xs text-subtext pt-2 leading-relaxed">
              A plausible path to hospital adoption is a per-member licensing model, cost-shared with insurers who
              benefit from fewer preventable admissions. This is a business hypothesis, not a costed estimate.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
