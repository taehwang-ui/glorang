/**
 * 주제별 수업 계획. 선생님이 즉흥으로만 하지 않고 정해진 어휘·문장 틀·역할극·게임을 쓰게 한다.
 * 세션 system 블록에 들어가므로 세션 내에서 캐시된다. 레벨 조정은 prompt.ts 의 LEVEL_GUIDANCE 가 담당.
 *
 * scripts/sync-demo-prompt.mjs 가 아래 마커 사이를 데모에 복사하므로 순수 객체 리터럴만 둔다.
 */
export interface LessonPlan {
  goals: string[];
  vocabulary: { word: string; emoji: string; ko: string }[];
  frames: string[];
  rolePlay: string;
  game: string;
}

/* LESSONS:BEGIN */
export const LESSON_PLANS: Record<string, LessonPlan> = {
  favorites: {
    goals: ["Say what I like and why", "Ask a friend what they like"],
    vocabulary: [
      { word: "favorite", emoji: "⭐", ko: "가장 좋아하는" },
      { word: "color", emoji: "🎨", ko: "색깔" },
      { word: "game", emoji: "🎮", ko: "게임" },
      { word: "song", emoji: "🎵", ko: "노래" },
      { word: "because", emoji: "💬", ko: "왜냐하면" },
      { word: "fun", emoji: "😆", ko: "재미있는" },
    ],
    frames: ["My favorite ___ is ___.", "I like ___ because ___.", "What is your favorite ___?"],
    rolePlay: "The student is a TV reporter interviewing Coco about Coco's favorite things, then they swap.",
    game: "Guess my favorite: Coco gives three clues about a favorite thing and the student guesses. Then the student gives clues.",
  },
  animals: {
    goals: ["Name animals and say what they can do", "Describe a pet or a dream pet"],
    vocabulary: [
      { word: "pet", emoji: "🐾", ko: "반려동물" },
      { word: "dog", emoji: "🐶", ko: "개" },
      { word: "cat", emoji: "🐱", ko: "고양이" },
      { word: "fast", emoji: "💨", ko: "빠른" },
      { word: "cute", emoji: "🥰", ko: "귀여운" },
      { word: "can fly", emoji: "🦅", ko: "날 수 있다" },
    ],
    frames: ["I have a ___.", "A ___ can ___.", "I want a ___ because ___."],
    rolePlay: "The student is a zookeeper showing Coco around the zoo, introducing three animals.",
    game: "Animal sounds: Coco makes a sound in words (woof, meow, moo) and the student names the animal, then swap.",
  },
  food: {
    goals: ["Say what food I like and don't like", "Order food politely"],
    vocabulary: [
      { word: "pizza", emoji: "🍕", ko: "피자" },
      { word: "rice", emoji: "🍚", ko: "밥" },
      { word: "sweet", emoji: "🍭", ko: "달콤한" },
      { word: "spicy", emoji: "🌶️", ko: "매운" },
      { word: "delicious", emoji: "😋", ko: "맛있는" },
      { word: "I'd like", emoji: "🙏", ko: "~주세요" },
    ],
    frames: ["I like ___ but I don't like ___.", "___ is too spicy.", "I'd like ___, please."],
    rolePlay: "Restaurant: Coco is the waiter, the student orders lunch. Then the student is the waiter.",
    game: "Food quiz: Coco describes a food (It is round, it is red, it is a fruit) and the student guesses.",
  },
  myday: {
    goals: ["Talk about my daily routine with times", "Use morning, afternoon, evening"],
    vocabulary: [
      { word: "wake up", emoji: "⏰", ko: "일어나다" },
      { word: "breakfast", emoji: "🥣", ko: "아침 식사" },
      { word: "school", emoji: "🏫", ko: "학교" },
      { word: "homework", emoji: "📚", ko: "숙제" },
      { word: "play", emoji: "⚽", ko: "놀다" },
      { word: "go to bed", emoji: "🛏️", ko: "자러 가다" },
    ],
    frames: ["I wake up at ___.", "In the morning, I ___.", "After school, I ___."],
    rolePlay: "Coco is a robot who does not know what a day is. The student teaches the robot what to do from morning to night.",
    game: "Order the day: Coco says three activities out of order and the student says them in the right order.",
  },
  family: {
    goals: ["Introduce family members", "Say what family members like or do"],
    vocabulary: [
      { word: "mom", emoji: "👩", ko: "엄마" },
      { word: "dad", emoji: "👨", ko: "아빠" },
      { word: "sister", emoji: "👧", ko: "언니/누나/여동생" },
      { word: "brother", emoji: "👦", ko: "오빠/형/남동생" },
      { word: "grandma", emoji: "👵", ko: "할머니" },
      { word: "together", emoji: "🤝", ko: "함께" },
    ],
    frames: ["This is my ___.", "My ___ likes ___.", "We ___ together."],
    rolePlay: "Family photo: the student describes an imaginary family photo on the board and Coco asks questions about each person.",
    game: "Who is it? Coco describes a family member (She is tall. She likes cooking.) and the student guesses who.",
  },
  school: {
    goals: ["Talk about school subjects and friends", "Say what I do at school"],
    vocabulary: [
      { word: "teacher", emoji: "👩‍🏫", ko: "선생님" },
      { word: "friend", emoji: "🧑‍🤝‍🧑", ko: "친구" },
      { word: "math", emoji: "➗", ko: "수학" },
      { word: "art", emoji: "🖍️", ko: "미술" },
      { word: "recess", emoji: "🛝", ko: "쉬는 시간" },
      { word: "boring", emoji: "🥱", ko: "지루한" },
    ],
    frames: ["My favorite subject is ___.", "At recess, I ___ with ___.", "___ is fun but ___ is hard."],
    rolePlay: "New student: Coco is new at school and the student shows Coco around and introduces a friend.",
    game: "Subject charades in words: Coco describes what you do in a class and the student names the subject.",
  },
  weekend: {
    goals: ["Talk about the past using went, ate, played, saw", "Ask what someone did"],
    vocabulary: [
      { word: "went", emoji: "🚶", ko: "갔다" },
      { word: "played", emoji: "🎲", ko: "놀았다" },
      { word: "ate", emoji: "🍽️", ko: "먹었다" },
      { word: "saw", emoji: "👀", ko: "봤다" },
      { word: "park", emoji: "🌳", ko: "공원" },
      { word: "movie", emoji: "🎬", ko: "영화" },
    ],
    frames: ["On Saturday, I ___.", "I went to ___ with ___.", "It was ___."],
    rolePlay: "Weekend news: the student is a news reporter telling the weekend news about themselves. Coco asks follow-up questions.",
    game: "True or false: Coco says three things Coco did last weekend, one is silly and false. The student finds it, then makes their own.",
  },
  free: {
    goals: ["Keep a conversation going", "Ask Coco questions too"],
    vocabulary: [
      { word: "really?", emoji: "😮", ko: "정말?" },
      { word: "me too", emoji: "🙋", ko: "나도" },
      { word: "why", emoji: "❓", ko: "왜" },
      { word: "how about you?", emoji: "🔄", ko: "너는?" },
      { word: "awesome", emoji: "🤩", ko: "멋진" },
      { word: "maybe", emoji: "🤔", ko: "아마" },
    ],
    frames: ["I think ___.", "How about you?", "Can you tell me about ___?"],
    rolePlay: "Talk show: the student is the host and Coco is the guest, then swap.",
    game: "Would you rather: Coco gives two funny choices and the student picks one and says why.",
  },
};
/* LESSONS:END */

export function lessonPlanText(topicId: string): string {
  const plan = LESSON_PLANS[topicId] ?? LESSON_PLANS.free;
  return [
    "Lesson plan for today (adapt to the student's level; do not read it aloud as a list):",
    `- Goals: ${plan.goals.join("; ")}`,
    `- Key words to teach and reuse (word / emoji / Korean): ${plan.vocabulary.map((v) => `${v.word} / ${v.emoji} / ${v.ko}`).join(", ")}`,
    `- Sentence frames: ${plan.frames.join(" | ")}`,
    `- Role-play idea: ${plan.rolePlay}`,
    `- Game idea: ${plan.game}`,
  ].join("\n");
}

export type LessonPhase = "warm-up" | "topic talk" | "role-play or game" | "wrap-up";

/** 경과 비율(0~1)로 수업 단계를 정한다. 단계가 바뀔 때만 노트를 보낸다. */
export function lessonPhase(elapsedFraction: number): LessonPhase {
  if (elapsedFraction < 0.15) return "warm-up";
  if (elapsedFraction < 0.55) return "topic talk";
  if (elapsedFraction < 0.85) return "role-play or game";
  return "wrap-up";
}
