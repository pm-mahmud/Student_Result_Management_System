function gradeFromMarks(value) {
  const marks = Number(value);
  if (marks >= 80) return { letterGrade: 'A+', gradePoint: 4.00 };
  if (marks >= 75) return { letterGrade: 'A', gradePoint: 3.75 };
  if (marks >= 70) return { letterGrade: 'A-', gradePoint: 3.50 };
  if (marks >= 65) return { letterGrade: 'B+', gradePoint: 3.25 };
  if (marks >= 60) return { letterGrade: 'B', gradePoint: 3.00 };
  if (marks >= 55) return { letterGrade: 'B-', gradePoint: 2.75 };
  if (marks >= 50) return { letterGrade: 'C+', gradePoint: 2.50 };
  if (marks >= 45) return { letterGrade: 'C', gradePoint: 2.25 };
  if (marks >= 40) return { letterGrade: 'D', gradePoint: 2.00 };
  return { letterGrade: 'F', gradePoint: 0.00 };
}

module.exports = { gradeFromMarks };
