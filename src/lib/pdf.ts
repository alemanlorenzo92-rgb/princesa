import jsPDF from "jspdf";

export function exportMaterialToPdf({
  appName,
  subjectName,
  title,
  createdAt,
  content,
}: {
  appName: string;
  subjectName: string;
  title: string;
  createdAt: string;
  content: string;
}) {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const lines = pdf.splitTextToSize(content, 500);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.text(appName, 48, 52);

  pdf.setFontSize(16);
  pdf.text(title, 48, 86);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Materia: ${subjectName}`, 48, 112);
  pdf.text(`Fecha: ${createdAt}`, 48, 130);

  pdf.setFontSize(12);
  pdf.text(lines, 48, 170);
  pdf.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
