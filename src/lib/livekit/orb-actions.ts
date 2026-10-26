import React from "react";

export interface OrbFormData {
  name: string;
  restaurant: string;
  contact: string;
  channels: string[];
  pos: string;
  slot: string;
}

export type SlotRequest = { day?: string; time?: string };

export type SlotResult =
  | { ok: true; slot: string }
  | {
      ok: false;
      reason: "no_form" | "day_unavailable" | "time_unavailable";
      available_days?: string[];
      available_times?: string[];
    };

export interface OrbActionHelpers {
  navigateTo: (section: string) => void;
  fillDOMField: (id: string, value: string) => void;
  selectPOSInDOM: (posName: string) => void;
  syncChannelsInDOM: (channels: string[]) => void;
  selectSlotInDOM: (req?: SlotRequest) => Promise<SlotResult>;
  selectTomorrowSlotInDOM?: () => Promise<string>;
  submitBookingFormInDOM: () => void;
  handleROIFromTool: (input: { missed_calls_per_week?: number; avg_order_value?: number }) => string;
  setUserName: (name: string) => void;
  formDataRef: React.MutableRefObject<OrbFormData>;
  onClose: () => void;
}

/**
 * Executes ONE website action requested by the LiveKit agent (via the "orb_action" RPC).
 * The returned object is sent back to the agent as the tool result.
 */
export async function executeOrbAction(
  name: string,
  input: any = {},
  helpers: OrbActionHelpers
): Promise<any> {
  const {
    navigateTo,
    fillDOMField,
    selectPOSInDOM,
    syncChannelsInDOM,
    selectSlotInDOM,
    submitBookingFormInDOM,
    handleROIFromTool,
    setUserName,
    formDataRef,
    onClose,
  } = helpers;

  switch (name) {
    case "navigate_to":
      console.log(`%c[Voice Orb Action] 🧭 navigate_to("${input.section}")`, "color: #f59e0b; font-weight: bold;");
      if (input.section) {
        navigateTo(input.section);
      }
      return { ok: true };

    case "calculate_roi": {
      console.log("%c[Voice Orb Action] 💰 calculate_roi", "color: #f59e0b; font-weight: bold;", input);
      const summary = handleROIFromTool(input);
      return { ok: true, summary };
    }

    case "fill_booking_field": {
      console.log(`%c[Voice Orb Action] 📝 fill_booking_field(${input.field} = "${input.value}")`, "color: #f59e0b; font-weight: bold;");
      const { field, value } = input;
      if (field && value !== undefined && value !== null) {
        const valStr = String(value);
        if (field === "name") {
          const trimmed = valStr.trim();
          formDataRef.current.name = trimmed;
          fillDOMField("k-n", trimmed);
          setUserName(trimmed);
        } else if (field === "restaurant") {
          formDataRef.current.restaurant = valStr;
          fillDOMField("k-r", valStr);
        } else if (field === "contact") {
          formDataRef.current.contact = valStr;
          fillDOMField("k-c", valStr);
        } else if (field === "pos") {
          formDataRef.current.pos = valStr;
          selectPOSInDOM(valStr);
        } else if (field === "channels") {
          const parts = valStr.split(",").map((s) => s.trim()).filter(Boolean);
          formDataRef.current.channels = parts;
          syncChannelsInDOM(parts);
        }
      }
      return { ok: true };
    }

    case "select_slot": {
      console.log("%c[Voice Orb Action] 📅 select_slot", "color: #f59e0b; font-weight: bold;", input);
      const result = await selectSlotInDOM({ day: input?.day, time: input?.time });
      return result; // { ok: true, slot } or { ok: false, reason, available_days?, available_times? }
    }

    case "submit_booking": {
      console.log("%c[Voice Orb Action] 🚀 submit_booking()", "color: #f59e0b; font-weight: bold;");
      if (!formDataRef.current.slot || !formDataRef.current.slot.trim()) {
        return { ok: false, error: "Please choose a day and time" };
      }
      submitBookingFormInDOM();

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const isDone = () => {
        const k = document.getElementById("kdone");
        return !!k && !k.hidden && k.style.display !== "none";
      };
      const submitBtn = () => document.querySelector<HTMLButtonElement>('#kf button[type="submit"]');

      // Wait for the real result: success card, or the form going idle again without it (validation failed).
      await sleep(250); // let onsubmit start
      const start = Date.now();
      let outcome: "done" | "failed" | "timeout" = "timeout";
      while (Date.now() - start < 7000) { // stay under the agent's 8s RPC timeout
        if (isDone()) { outcome = "done"; break; }
        const b = submitBtn();
        const pending = !!b && (b.disabled || /booking demo/i.test(b.textContent || ""));
        if (!pending && Date.now() - start > 400) {
          await sleep(100);
          outcome = isDone() ? "done" : "failed";
          break;
        }
        await sleep(100);
      }

      if (outcome === "done") return { ok: true };
      if (outcome === "timeout") {
        return { ok: false, error: "The request is taking longer than expected to send" };
      }

      // Genuine failure: only read real validation errors
      let errorMsg = "";
      const foundErr = Array.from(document.querySelectorAll<HTMLElement>(".kxi.err .kxe"))
        .find((el) => el.textContent && el.textContent.trim().length > 0);
      if (foundErr?.textContent) {
        errorMsg = foundErr.textContent.trim();
      } else {
        const psum = document.getElementById("psum");
        if (psum && psum.classList.contains("pe") && psum.textContent) errorMsg = psum.textContent.trim();
      }
      return { ok: false, error: errorMsg || "Required form fields are missing" };
    }

    case "end_call":
      console.log("%c[Voice Orb Action] 📞 end_call()", "color: #f59e0b; font-weight: bold;");
      setTimeout(onClose, typeof input.delay_ms === "number" ? input.delay_ms : 2500);
      return { ok: true };

    default:
      return { ok: false, error: `unknown action ${name}` };
  }
}
