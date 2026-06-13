import asyncio
import json
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.services.ai.extractor import clean_json_text, generate_gemini_text

BASELINE_PIPELINE_VERSION = "baseline_llm_direct_v1"
BASELINE_RETRY_DELAYS = [10, 30, 60]


def is_gemini_quota_error(exc: Exception) -> bool:
    error_text = str(exc)
    return (
        "429" in error_text
        or "RESOURCE_EXHAUSTED" in error_text
        or "quota" in error_text.lower()
    )


class BaselineEvaluationPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    match_score: float = 0
    score_scale: str = "0-100"
    summary: str = ""
    score_reason: str = ""
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    interview_questions: list[dict[str, Any]] = Field(default_factory=list)
    recommendation: str = ""


def validate_baseline_payload(raw_text: str) -> dict:
    data = json.loads(clean_json_text(raw_text))
    raw_score_scale = str(data.get("score_scale") or "").strip().lower() if isinstance(data, dict) else ""
    payload = BaselineEvaluationPayload.model_validate(data)
    result = payload.model_dump()

    score = float(result.get("match_score") or 0)
    summary_text = f"{result.get('summary', '')} {result.get('score_reason', '')}".lower()
    positive_words = [
        "rất phù hợp",
        "xuất sắc",
        "phù hợp cao",
        "gần như hoàn hảo",
        "vượt trội",
        "rất tương xứng",
        "phù hợp gần như hoàn hảo",
        "strong match",
        "excellent match",
    ]

    if raw_score_scale in {"0-10", "10", "10-point", "10 point"} and 0 <= score <= 10:
        score = score * 10
        result["score_warning"] = "Baseline score was converted from a 0-10 scale to 0-100."
    elif not raw_score_scale and 0 <= score <= 10 and any(word in summary_text for word in positive_words):
        score = score * 10
        result["score_warning"] = "Baseline score may have been returned on a 0-10 scale and was converted to 0-100."

    result["match_score"] = max(0, min(100, round(score, 2)))
    result["score_scale"] = "0-100"
    if result["match_score"] <= 20 and any(word in summary_text for word in positive_words):
        result["score_warning"] = "Baseline score may be inconsistent with its explanation."
    result["pipeline_name"] = "baseline_llm_direct"
    result["pipeline_version"] = BASELINE_PIPELINE_VERSION
    result["scoring_method"] = "llm_direct_only"
    result["status"] = "processed"

    return result


async def evaluate_baseline_cv_jd(cv_text: str, jd_text: str) -> dict:
    prompt = f"""
You are a senior IT recruiter for the Japanese market.

Evaluate how well the candidate CV fits the target JD.
This is a BASELINE evaluation.

Important rules:
- Use only CV text and JD text.
- Do not use embedding.
- Do not use rubric scoring.
- Do not calculate confidence.
- Do not perform complex ITSS penalty.
- match_score must be a percentage from 0 to 100.
- Do not use a 0-10 scale.
- For a strong match, use 80-95.
- For a medium match, use 50-75.
- For a weak match, use 0-45.
- The score_reason must be consistent with match_score.
- Return only one valid JSON object.
- Write all explanation fields in Vietnamese.

Output schema:
{{
  "match_score": 0,
  "score_scale": "0-100",
  "summary": "Nhan xet tong quan bang tieng Viet",
  "score_reason": "Ly do cho diem bang tieng Viet",
  "matched_skills": ["Ky nang khop voi JD"],
  "missing_skills": ["Ky nang/yeu cau con thieu so voi JD"],
  "strengths": ["Diem manh tu CV"],
  "weaknesses": ["Diem yeu hoac diem can xac minh"],
  "interview_questions": [
    {{
      "category": "Ky thuat",
      "question": "Cau hoi phong van",
      "intent": "Muc dich danh gia"
    }}
  ],
  "recommendation": "Khuyen nghi cho HR"
}}

CV:
{cv_text}

JD:
{jd_text}
"""

    last_error = None

    for attempt in range(len(BASELINE_RETRY_DELAYS) + 1):
        try:
            raw_text = await generate_gemini_text(prompt)
            result = validate_baseline_payload(raw_text)
            result["status"] = "processed"
            return result
        except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as exc:
            return {
                "pipeline_name": "baseline_llm_direct",
                "pipeline_version": BASELINE_PIPELINE_VERSION,
                "scoring_method": "llm_direct_only",
                "status": "failed",
                "error": f"Baseline JSON validation failed: {str(exc)}",
                "match_score": None,
            }
        except Exception as exc:
            last_error = exc
            if is_gemini_quota_error(exc):
                return {
                    "pipeline_name": "baseline_llm_direct",
                    "pipeline_version": BASELINE_PIPELINE_VERSION,
                    "scoring_method": "llm_direct_only",
                    "status": "quota_exceeded",
                    "error": f"Baseline skipped due to Gemini quota: {str(exc)}",
                    "match_score": None,
                }

            if attempt < len(BASELINE_RETRY_DELAYS):
                delay = BASELINE_RETRY_DELAYS[attempt]
                print(
                    f"[Baseline Warning] Gemini baseline attempt {attempt + 1} failed: {exc}. "
                    f"Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
            else:
                break

    return {
        "pipeline_name": "baseline_llm_direct",
        "pipeline_version": BASELINE_PIPELINE_VERSION,
        "scoring_method": "llm_direct_only",
        "status": "failed",
        "error": f"Baseline Gemini failed after retries: {str(last_error)}",
        "match_score": None,
    }
