const REJECTION = "I'm your Debate Coach! Please share a debate topic, argument, or position you'd like to work on.";

const NON_DEBATE = [
  /^(hi|hello|hey|yo|sup)[!?\s]*$/i,
  /\b(code|program|script|function|debug|html|css|python|javascript)\b/i,
  /\b(recipe|cook|bake|ingredient)\b/i,
  /\b(weather|forecast|temperature)\b.*\b(today|tomorrow)\b/i,
  /\btranslate\b.*\b(to|from)\b/i,
  /\b(poem|story|joke|song|lyrics)\b/i,
  /\b(image|picture|photo|video|draw|paint)\b/i,
];

const DEBATE_SIGNALS = [
  "debate", "argue", "argument", "counter", "rebuttal", "refute",
  "pros", "cons", "claim", "evidence", "should", "ethical", "moral",
  "ban", "legalize", "policy", "position", "stance", "opinion",
  "agree", "disagree", "support", "oppose", "believe", "think",
  "advantage", "disadvantage", "benefit", "harm", "right", "wrong",
];

function validateDebateInput(message) {
  const text = message.toLowerCase().trim();
  
  if (text.length < 5) {
    return { isValid: false, rejectionMessage: REJECTION };
  }

  for (const pattern of NON_DEBATE) {
    if (pattern.test(text)) {
      return { isValid: false, rejectionMessage: REJECTION };
    }
  }

  for (const signal of DEBATE_SIGNALS) {
    if (text.includes(signal)) {
      return { isValid: true };
    }
  }

  // Allow longer messages through (AI will filter)
  return { isValid: text.length >= 10 };
}

module.exports = { validateDebateInput };