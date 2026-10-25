
/* Lumina demo samples.
   Adds sample data only when the corresponding storage key is empty.
   Existing saved data is not overwritten.
*/
(function () {
  "use strict";

  function seed(key, value) {
    try {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn("Could not add Lumina demo data:", key, error);
    }
  }

  const today = new Date();

  function datePlus(days) {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  // Sample student profile
  seed("luminaProfile", {
    fullName: "Aarav Demo",
    course: "B.Sc. Computer Science with Artificial Intelligence",
    semester: "6",
    subjects: [
      "Computer Vision",
      "Artificial Intelligence",
      "Python",
      "Statistics"
    ],
    goals: [
      "Improve understanding",
      "Prepare for exams",
      "Build projects"
    ]
  });

  // Sample notes
  seed("luminaNotes", [
    {
      id: "demo-cv-1",
      title: "Introduction to Computer Vision",
      subject: "Computer Vision",
      content: "Computer Vision enables computers to understand images and videos.\n\nMain steps:\n1. Image acquisition\n2. Pre-processing\n3. Feature extraction\n4. Recognition or classification\n\nApplications include face recognition, medical image analysis and object detection.",
      source: "demo",
      createdAt: "2026-10-20T10:00:00.000Z",
      updatedAt: "2026-10-20T10:00:00.000Z"
    },
    {
      id: "demo-ai-1",
      title: "Artificial Intelligence Basics",
      subject: "Artificial Intelligence",
      content: "Artificial Intelligence enables computers to perform tasks that usually require human intelligence.\n\nExamples include learning, reasoning, problem-solving and language understanding.\n\nApplications include expert systems, virtual assistants and robotics.",
      source: "demo",
      createdAt: "2026-10-21T10:00:00.000Z",
      updatedAt: "2026-10-21T10:00:00.000Z"
    },
    {
      id: "demo-py-1",
      title: "Python Fundamentals",
      subject: "Python",
      content: "Python is a high-level programming language.\n\nImportant basics:\n- Variables store values.\n- Conditions use if, elif and else.\n- Loops repeat instructions.\n- Functions are defined using def.\n\nExample: for i in range(1, 4): print(i)",
      source: "demo",
      createdAt: "2026-10-22T10:00:00.000Z",
      updatedAt: "2026-10-22T10:00:00.000Z"
    },
    {
      id: "demo-stat-1",
      title: "Mean, Median and Mode",
      subject: "Statistics",
      content: "Mean = sum of values divided by the number of values.\nMedian = middle value after sorting the data.\nMode = most frequently occurring value.\n\nExample: 2, 3, 3, 4, 8. Mean = 4, median = 3, mode = 3.",
      source: "demo",
      createdAt: "2026-10-22T11:00:00.000Z",
      updatedAt: "2026-10-22T11:00:00.000Z"
    }
  ]);

  // Sample Study Planner tasks
  seed("luminaStudyPlannerItems", [
    {
      id: "demo-plan-1",
      title: "Revise image formation",
      category: "Study",
      subject: "Computer Vision",
      date: datePlus(1),
      description: "Review the main steps and draw the process diagram.",
      completed: false,
      createdAt: today.getTime()
    },
    {
      id: "demo-plan-2",
      title: "Prepare AI unit notes",
      category: "Assignments",
      subject: "Artificial Intelligence",
      date: datePlus(2),
      description: "Write definitions and applications in point form.",
      completed: false,
      createdAt: today.getTime()
    },
    {
      id: "demo-plan-3",
      title: "Python practice",
      category: "Revision",
      subject: "Python",
      date: datePlus(3),
      description: "Practise conditions, loops and functions.",
      completed: true,
      createdAt: today.getTime()
    },
    {
      id: "demo-plan-4",
      title: "Statistics unit test",
      category: "Exams",
      subject: "Statistics",
      date: datePlus(5),
      description: "Revise mean, median and mode.",
      completed: false,
      createdAt: today.getTime()
    }
  ]);

  // Sample subject important questions
  seed("luminaSubjectQuestions", {
    "Computer Vision": [
      "Define Computer Vision and explain its applications.",
      "Explain the steps involved in digital image formation.",
      "What is Content-Based Image Retrieval (CBIR)?"
    ],
    "Artificial Intelligence": [
      "Define Artificial Intelligence.",
      "Explain the components of an expert system.",
      "Write the advantages and applications of AI."
    ],
    "Python": [
      "Explain conditional statements in Python.",
      "Differentiate between for and while loops."
    ],
    "Statistics": [
      "Define mean, median and mode with examples.",
      "Explain the difference between population and sample."
    ]
  });

  // Sample Learning Progress data
  seed("luminaProgressModes", {
    "Computer Vision": "units",
    "Artificial Intelligence": "units",
    "Python": "units",
    "Statistics": "units"
  });

  seed("luminaSubjectUnits", {
    "Computer Vision": [
      { title: "Image formation", completed: true },
      { title: "Image enhancement", completed: true },
      { title: "Edge detection", completed: false },
      { title: "Image segmentation", completed: false }
    ],
    "Artificial Intelligence": [
      { title: "Introduction to AI", completed: true },
      { title: "Expert systems", completed: false },
      { title: "Knowledge representation", completed: false }
    ],
    "Python": [
      { title: "Variables and data types", completed: true },
      { title: "Conditions and loops", completed: true },
      { title: "Functions", completed: false }
    ],
    "Statistics": [
      { title: "Mean, median and mode", completed: true },
      { title: "Probability basics", completed: false }
    ]
  });

})();
