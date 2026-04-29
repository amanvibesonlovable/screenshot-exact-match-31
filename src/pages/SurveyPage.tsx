import { useParams } from "react-router-dom";
import { SurveyChat } from "@/survey/SurveyChat";
import { SURVEY_DAY_15 } from "@/survey/survey-config";

/**
 * /s/:token — Trainee chat survey route.
 * Currently: runs Survey 1 (Day 15) with a mock trainee for design preview.
 * Once Lovable Cloud is wired, this will look up the employee by token,
 * compute days_since_joining, and pick the right SURVEYS[stage].
 */
const SurveyPage = () => {
  const { token } = useParams<{ token: string }>();
  // Placeholder trainee — replace with DB lookup after Cloud is enabled.
  const traineeName = "Aarav";

  // Friendly demo: any token works for now. Eligibility windows come next.
  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-warm px-6 text-center">
        <p className="text-muted-foreground">This link looks incomplete.</p>
      </div>
    );
  }

  return <SurveyChat config={SURVEY_DAY_15} traineeName={traineeName} />;
};

export default SurveyPage;
