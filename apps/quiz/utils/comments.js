function getComment(score) {
  if (score >= 96 && score <= 100)
    return "Perfect score! Did you cheat? Be honest...";
  if (score >= 91 && score <= 95)
    return "Excellent work! So close to perfection, it's almost tragic.";
  if (score >= 86 && score <= 90)
    return "Impressive! Just a few mistakes... that might haunt you forever.";
  if (score >= 81 && score <= 85)
    return "You've got most of it down. But those mistakes? Unforgivable.";
  if (score >= 76 && score <= 80) return "Nice job! Almost perfect. Almost.";
  if (score >= 71 && score <= 75)
    return "You're smarter than 75% of people who've taken this quiz. Or at least, 25% dumber.";
  if (score >= 66 && score <= 70)
    return "You're in the top two-thirds! Silver linings and all that.";
  if (score >= 61 && score <= 65)
    return "Not bad. But not good enough to brag about. Unless you're desperate.";
  if (score >= 56 && score <= 60)
    return "Better than average. But remember, average isn't exactly great.";
  if (score >= 50 && score <= 55)
    return "Just over half. Glass half full or half empty? Either way, it's not full marks.";
  if (score >= 46 && score <= 49)
    return "So close to 50%! That's like, half right, half wrong. Half good, half bad. A mixed bag of meh.";
  if (score >= 41 && score <= 45)
    return "Almost halfway there. You know, like to the end of a tragic comedy.";
  if (score >= 36 && score <= 40)
    return "Statistically, you might be below average. But you're above nothing!";
  if (score >= 31 && score <= 35)
    return "Hey, at least you beat your high score in failure.";
  if (score >= 26 && score <= 30)
    return "I've seen better scores in a kindergarten math test.";
  if (score >= 21 && score <= 25)
    return "You're on the right track... if the track is going the wrong way.";
  if (score >= 16 && score <= 20)
    return "Guessing didn't work out too well, did it?";
  if (score >= 11 && score <= 15)
    return "Well, at least you tried. Did you though? Really?";
  if (score >= 6 && score <= 10)
    return "Looks like you learned something today... just not from this quiz.";
  if (score >= 0 && score <= 5)
    return "Did you even read the questions? Or did you just guess 'C' for everything?";
  return "Please enter a valid score.";
}

export default getComment;
