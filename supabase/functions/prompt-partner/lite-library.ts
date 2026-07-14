// Canned Ezra Research Lite responses. Religious-prose vertical.
// Each variant is markdown, suitable for streaming. Ends with a CTA to sign up.

export type Bucket =
  | "wedding"
  | "funeral"
  | "vbs"
  | "bible_study"
  | "devotional"
  | "theology"
  | "youth"
  | "communications"
  | "holidays"
  | "fallback";

export const BUCKETS: Bucket[] = [
  "wedding", "funeral", "vbs", "bible_study", "devotional",
  "theology", "youth", "communications", "holidays", "fallback",
];

export function nexusClosingPayload(bucket: Bucket) {
  return { type: "lite_closing", bucket };
}


export const LIBRARY: Record<Bucket, string[]> = {
  wedding: [
`Welcome, family and friends. We are gathered here today to witness and celebrate the union of two lives. Marriage is a profound journey, built not just on romance, but on a foundation of enduring patience, mutual respect, and unwavering faith. As you step into this new season together, remember that love is not merely a feeling, but a daily choice to serve one another selflessly. May your home be a sanctuary of peace, and may your partnership reflect the grace and commitment that anchors us all in times of both joy and trial.

> To generate full-length, personalized wedding ceremonies, custom vows, and pastoral scripts tailored to specific couples, sign up for a free account today and unlock our complete ministry writing suite.`,

`Today, we celebrate a covenant of love. When two people commit their lives to one another, they are making a bold promise to face the future side by side. A strong marriage acts as a shelter in life's storms and a shared celebration in its victories. It requires forgiveness, humor, and a shared spiritual foundation to truly flourish. As you exchange these rings, let them serve as a constant, physical reminder of the unbroken circle of your commitment. May your love grow deeper and more resilient with every passing year.

> Want to adapt this template for different denominations or integrate specific scripture readings? Create your free account now to access dynamic sermon generation.`,

`It is a joy to stand with you today as you begin this new chapter. The beauty of marriage lies in its ability to transform two independent lives into a unified partnership. This union is a living example of steadfast devotion. Through all the shifting seasons of life, your commitment to one another will be your greatest asset. Cultivate kindness, prioritize open communication, and never lose sight of the faith that brought you together. May your days be filled with shared laughter and your home overflowing with hospitality.

> Ready to build a comprehensive playbook of ceremonial scripts? Sign up for a free account to instantly draft beautifully articulated blessings and homilies.`,
  ],

  funeral: [
`In moments of profound loss, words often feel inadequate. Today, we gather not only to mourn the passing of a deeply loved soul, but to celebrate the indelible mark they left on our lives. Grief is a heavy burden, yet it is also a testament to the depth of our love. As we walk through this valley of shadows, we cling to the hope and comfort found in our faith, trusting that peace will ultimately replace our pain. Let us honor their memory by carrying forward the kindness and light they shared with us.

> To draft personalized eulogies, comforting memorial services, and pastoral letters of condolence, sign up for your free account today.`,

`We come together today to remember a life beautifully lived. Saying goodbye is never easy, and the sorrow we feel is a natural reflection of the bond we shared. Yet, amidst our tears, we find comfort in the promises of eternity and the enduring grace of God. We remember the laughter, the quiet moments of strength, and the unwavering love they freely gave. Though they are no longer physically present, their spirit remains woven into the fabric of our community. May you find solace in faith and strength in the support of those gathered around you.

> Want to instantly adjust the tone or weave specific personal anecdotes into this message? Create a free account to unlock our empathetic writing tools.`,

`Today, we pause to honor a remarkable journey. The fragility of life reminds us to cherish every moment and every relationship. While our hearts are heavy with grief, we do not sorrow without hope. We lean on the divine comfort that surrounds us, trusting that rest has been found. As we reflect on the legacy left behind, let us be inspired to live with the same generosity and purpose. May the peace that surpasses all understanding guard your hearts in the days and weeks ahead.

> To effortlessly create respectful, deeply moving memorial content and pastoral outreach materials, sign up for a free account and start scaling your ministry's support network.`,
  ],

  vbs: [
`Here is a high-level overview for a 5-day VBS curriculum themed **"Wilderness Explorers."**

- **Day 1 — The Journey Begins** · trusting the path
- **Day 2 — Navigating the Storms** · finding peace in fear
- **Day 3 — The Oasis** · spiritual rest and restoration
- **Day 4 — Following the Compass** · making wise choices
- **Day 5 — Reaching the Summit** · celebrating community and faith

Each day includes an opening assembly script, a main Bible story, two interactive game concepts, and a themed craft activity designed for ages 5–11.

> To instantly expand this outline into a comprehensive, 50-page daily leader's guide complete with dialogue and supply lists, sign up for your free account today.`,

`Welcome to the **"Ocean Deep"** VBS curriculum outline.

- **Day 1 — The Great Dive** · discovering hidden treasures of faith
- **Day 2 — Riding the Waves** · perseverance through challenges
- **Day 3 — Coral Reef Community** · loving our neighbors
- **Day 4 — The Lighthouse** · being a guiding light
- **Day 5 — The Ultimate Catch** · sharing the message

This framework uses engaging nautical themes to teach fundamental spiritual truths. It includes suggestions for themed snacks, memory verse challenges, and volunteer coordination notes.

> Want to generate custom curriculum materials tailored specifically to your church's resources and volunteer size? Create a free account now to access our complete educational planning suite.`,

`Here is your blueprint for the **"Space Pioneers"** 5-day VBS program.

- **Day 1 — Blast Off** · the foundation of faith
- **Day 2 — Navigating the Stars** · seeking divine guidance
- **Day 3 — Zero Gravity** · letting go of worries
- **Day 4 — The Milky Way** · the vastness of creation
- **Day 5 — Mission Accomplished** · returning home with good news

This outline pairs high-energy cosmic themes with foundational theological lessons, perfect for engaging modern youth.

> Ready to turn this skeleton into a fully fleshed-out digital publication for your ministry staff? Sign up for a free account today and start building dynamic, week-long event scripts effortlessly.`,
  ],

  bible_study: [
`Welcome to this week's small group study guide, focusing on the theme of **Resilience.**

- **Opening Question:** Share a time when an unexpected challenge altered your plans.
- **Context:** Reading from the Book of James, examining how trials produce perseverance.
- **Discussion 1:** How does society's view of hardship differ from the scriptural perspective?
- **Discussion 2:** What practical steps can we take to support one another when facing burnout?
- **Application:** Commit to checking in on one specific group member this week.
- **Closing Prayer:** A guided prayer for strength and communal support.

> To generate weekly study guides, discussion prompts, and leader preparation notes automatically, sign up for your free account today.`,

`Here is your structured small group discussion guide on the concept of **Forgiveness.**

- **Icebreaker:** What is the most difficult thing you've had to forgive yourself for?
- **Reading:** Select passages from the Gospel of Matthew regarding the unmerciful servant.
- **Question 1:** Why is there often a disconnect between receiving grace and extending it to others?
- **Question 2:** How does holding onto resentment physically and spiritually impact us?
- **Action Step:** Identify one area of lingering bitterness and pray for the willingness to release it.

> Want to adapt this guide for different maturity levels or demographic groups within your congregation? Create a free account now to unlock limitless curriculum generation.`,

`This week's small group framework centers on **Stewardship and Generosity.**

- **Opening:** Discuss a gift you received that completely surprised you.
- **Scriptural Focus:** Exploring the parables of the talents.
- **Discussion 1:** How do we shift our mindset from "ownership" to "stewardship" regarding our time and resources?
- **Discussion 2:** In what unconventional ways can we practice generosity outside of financial giving?
- **Challenge:** Dedicate two hours this weekend to a random act of service in your neighborhood.

> Ready to produce an entire quarter's worth of cohesive, engaging small group materials? Sign up for a free account and empower your lay leaders with exceptional discussion content.`,
  ],

  devotional: [
`In the quiet moments of the early morning, before the rush of the day begins, it is essential to center our minds. We live in a world that constantly demands our attention, pulling us in a dozen different directions. Today, take a deliberate pause. Breathe deeply and remember that your worth is not defined by your productivity, but by your inherent value as a creation. When the noise of life grows too loud, seek the stillness. Trust that you are guided and sustained, even when the path ahead seems unclear. Let grace be your starting point today.

> To generate daily devotionals, pastoral emails, and encouraging social media posts on demand, sign up for your free account today.`,

`It is easy to become overwhelmed by the sheer scale of the challenges we face in our communities and our personal lives. However, true impact rarely begins with a massive, sweeping gesture. It starts in the small, unseen moments of faithfulness. A kind word spoken to a stranger, a moment of patience with a frustrated child, or a quiet prayer in the midst of chaos — these are the building blocks of a meaningful life. Do not despise the days of small beginnings. Your quiet faithfulness is planting seeds you may never see grow.

> Want to create a fully customized, 30-day devotional series for your congregation? Create a free account now to access our dedicated spiritual writing tools.`,

`Hope is not a fragile, fleeting emotion; it is a resilient anchor for the soul. When circumstances shift and foundations tremble, hope reminds us that the current chapter is not the end of the story. Today, you may be facing a mountain that seems impossible to climb. But remember that strength is often forged in the very fires we wish to avoid. Lean into your faith, draw strength from your community, and take just one step forward. The dawn always follows the darkest part of the night.

> Ready to effortlessly author uplifting digital content and pastoral reflections? Sign up for a free account and start inspiring your audience today.`,
  ],

  theology: [
`This independent study module explores the multifaceted concept of **Grace.**

- **Objective:** Distinguish between common grace, which sustains humanity, and saving grace, which redeems it.
- **Historical Context:** A brief overview of how the Reformation redefined the understanding of unmerited favor.
- **Reflection Prompt:** How does the realization that grace cannot be earned change your daily interactions with others?
- **Study Task:** Journal your responses to three key scriptures highlighting the unconditional nature of divine love.

This framework is designed to move the reader from intellectual understanding to personal application.

> To generate complete, multi-chapter theological deep-dives and independent study books, sign up for your free account today.`,

`Welcome to the independent study on the **Theology of Suffering.**

- **Goal:** Navigate the complex question of why hardship exists within a divine plan.
- **Section 1:** The brokenness of the world and the reality of free will.
- **Section 2:** Examining scriptural narratives of individuals who endured profound loss yet maintained their faith.
- **Journaling Exercise:** Reflect on a personal season of difficulty and identify any unexpected growth that emerged from it.

This study encourages honest wrestling with difficult questions rather than offering platitudes.

> Want to expand this outline into a comprehensive digital course or printable workbook? Create a free account now to utilize our advanced content structuring models.`,

`Here is an independent study guide focusing on the **Discipline of Silence and Solitude.**

- **Core Concept:** In an era of digital saturation, spiritual clarity requires intentional withdrawal.
- **Practice:** Instructions for observing a 24-hour media fast and guided silence.
- **Reading:** Historical reflections from the Desert Fathers and early monastics on the value of escaping the crowd.
- **Reflection:** Record the internal distractions that surface when external noise is removed.

This module is ideal for individuals seeking spiritual renewal and mental clarity.

> Ready to build a vast library of self-guided spiritual formation resources? Sign up for a free account today and transform how you deliver religious education.`,
  ],

  youth: [
`Hey everyone — tonight we are talking about **identity.** It is so easy to let social media, your grades, or what other people say define who you are. You spend half your time scrolling through highlight reels, wondering why your life doesn't look like that. But here is the truth: your value was established long before you ever downloaded an app. You are uniquely wired, intentionally created, and deeply loved exactly as you are. Tonight, we're going to look at what it means to tune out the noise of the crowd and tune into the truth of your actual worth.

> To generate engaging, culturally relevant youth group sermons and discussion questions instantly, sign up for your free account today.`,

`Have you ever felt like you are just going through the motions? You show up to school, you go to practice, you do your homework, and then you do it all over again. Sometimes faith can feel like just another item on the checklist. But we aren't called to a boring, predictable life. We are invited into a radical, world-changing adventure. Tonight, we're looking at what happens when you step out of your comfort zone and start taking actual risks for what you believe in. It's time to stop playing it safe.

> Want to automatically draft high-energy youth ministry content and small group leader guides? Create a free account now.`,

`Let's talk about **friendships.** Look around the room. The people you surround yourself with are literally shaping the person you will become. Are your friends pushing you toward your goals, or are they pulling you into drama you don't need? Tonight, we're diving into the wisdom of choosing your inner circle carefully. We'll look at ancient examples of ride-or-die friendships that changed history, and talk practically about how to be a better friend yourself. Real loyalty is rare, but it changes everything.

> Ready to write compelling, Gen-Z focused ministry series without staring at a blank page? Sign up for a free account and supercharge your youth programming.`,
  ],

  communications: [
`**Subject:** An update on our upcoming community outreach.

Dear Church Family, as we approach the summer months, our focus turns toward serving the neighborhoods immediately surrounding our campus. Next Saturday, we will be hosting our annual block party and food drive. This is a vital opportunity to step outside our doors and demonstrate tangible love to our city. We currently need twenty more volunteers to help with setup and family registration. If you have an hour to spare, your presence will make a massive difference. Please click the link below to sign up.

> To instantly draft professional, persuasive, and warmly toned pastoral emails like this, sign up for your free account today.`,

`**Subject:** Walking alongside the Miller family.

Dear Congregation, it is with a heavy heart that I share the news of David Miller's sudden passing earlier this week. The Miller family has been a cornerstone of our community for over a decade. In times like these, the strength of our church family is paramount. We have organized a meal train to support Sarah and the kids over the next few weeks, and we invite you to participate if you are able. Please keep them in your continuous prayers during this incredibly difficult season.

> Want to easily generate sensitive, compassionate church-wide communications during critical moments? Create a free account now to access our pastoral writing tools.`,

`**Subject:** Exciting news about our building initiative!

Hello everyone, I am thrilled to announce that we have officially reached 80% of our fundraising goal for the new youth facility. Your overwhelming generosity and shared vision for the next generation have made this possible. Because of your commitment, we are scheduled to break ground early next spring. We will be holding a brief informational meeting immediately following the second service this Sunday to share the updated architectural renderings and timeline. Thank you for your continued faithfulness.

> Ready to automate your ministry newsletters and strategic communication campaigns? Sign up for a free account today and streamline your administrative workload.`,
  ],

  holidays: [
`The message of **Easter** is fundamentally a message of unexpected triumph. On Friday, the narrative seemed to end in utter defeat, darkness, and despair. But Sunday arrived, entirely upending the natural order of the world. The empty tomb is not just a historical claim; it is a present reality that declares that light will always conquer darkness, and life will ultimately swallow up death. Whatever "Friday" you are experiencing in your life right now — whatever grief, failure, or fear is holding you down — remember that the story isn't over. Sunday is coming.

> To generate powerful, culturally relevant holiday sermons and Easter campaign materials, sign up for your free account today.`,

`**Christmas** is the season of the profound paradox: the infinite confined to the finite, the creator entering creation as a vulnerable child. We often get lost in the commercial noise, the twinkling lights, and the frantic pacing of December. But the true heart of Advent is an invitation to stillness. It is a reminder that the divine does not always arrive in a conquering chariot, but often in the quietest, most unexpected places. As we light the candles this morning, let us prepare room in our own hearts for the quiet miracle of grace.

> Want to craft an entire Advent sermon series and accompanying daily devotionals? Create a free account now.`,

`As we gather this **Christmas Eve**, the world outside may be cold and dark, but inside this sanctuary, we are bathed in the light of an ancient promise fulfilled. The nativity story is essentially a story of hope breaking into a weary world. It tells us that we are not abandoned to the shadows. The arrival of this child signaled the dawn of a new era of reconciliation and peace. Tonight, let the familiar carols wash over you, and let the truth of Emmanuel — God with us — anchor your spirit for the coming year.

> Ready to effortlessly produce inspiring holiday liturgy and scriptural reflections? Sign up for a free account today.`,
  ],

  fallback: [
`It looks like you've ventured into uncharted territory. The specific theological concept or ministry topic you just entered falls slightly outside the scope of our preset demonstration models. In this limited preview environment, we use a curated selection of responses to showcase the speed and format of our platform without utilizing live API calls. While I cannot generate a custom pastoral response for that exact prompt right now, our full platform is equipped with advanced natural language models capable of handling highly complex, nuanced, and entirely original requests across any denomination or tradition.

> To experience unrestricted, dynamic AI generation powered by real-time processing, sign up for your free account today.`,

`I'm sorry, but that specific request isn't recognized by our current boilerplate demo. To keep this preview fast and accessible, we are routing inputs through a predefined set of examples rather than generating live, compute-heavy responses. Your prompt is interesting, but it requires the deeper contextual reasoning that only our full AI engine can provide. Whether you need to process large theological commentaries, draft extensive curriculum, or generate creative pastoral assets from scratch, our premium models are designed to handle it all effortlessly.

> Don't let your creativity be boxed in by a demo environment. Create a free account now to remove these training wheels.`,

`We don't have a pre-written response for that specific input in this sandbox environment. Because this is a lightweight, unauthenticated preview, we rely on a library of cached responses to simulate the user experience and demonstrate the interface design. Your query was unique, which means it requires our live, fully-powered AI models to generate a proper and accurate answer that aligns with your specific theological framework. The good news is that the full version of our software thrives on unique and complex prompts exactly like yours, adapting instantly to your specific ministry context.

> To access live inference and get a real answer to your prompt, sign up for your free account today.`,
  ],
};
