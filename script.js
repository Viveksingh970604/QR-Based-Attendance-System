let students = JSON.parse(localStorage.getItem("students")) || [];
let attendance = JSON.parse(localStorage.getItem("attendance")) || [];
let subject = document.getElementById('subject').value;
let clrBtn = document.getElementById('clrBtn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const photo = document.getElementById('photo');

console.log(subject);

// ---------------- Generate QR ----------------
document.getElementById('generateBtn').addEventListener('click', () => {
  let name = document.getElementById('name').value.trim();
  let roll = document.getElementById('roll').value.trim();
  let qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = "";

  if (!name || !roll) {
    alert('Please Enter both name and roll number');
    return;
  }

  const qrData = `${roll}|${name}`;
  new QRCode(qrContainer, {
    text: qrData,
    width: 180,
    height: 180,
  });

  if (!students.some((s) => s.roll === roll)) {
    students.push({ roll, name });
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('subject', JSON.stringify(subject));
  }

  const qrDisplayContainer = document.getElementById("qrDisplayContainer");
  const userInfo = document.getElementById("userInfo");
  userInfo.innerHTML = `<strong>Name:</strong> ${name} <br> <strong>Roll:</strong> ${roll}`;
  qrDisplayContainer.style.display = 'block';

  document.getElementById("name").value = '';
  document.getElementById("roll").value = '';
  displayAttendance();
});

// ---------------- Start Camera ----------------
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.play();
  } catch (err) {
    console.error("Error accessing camera: ", err);
  }
}
startCamera();

// ---------------- Capture Image After 1 Sec ----------------

function captureImageAfter2Seconds(roll, name) {
  setTimeout(() => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/png");
    photo.src = imageData;

    // ✅ Check if already marked
    const isAlreadyPresent = attendance.some(a => a.roll === roll);
    if (isAlreadyPresent) {
      alert(`${name}'s attendance already marked!`);
      return;
    }

    // Mark attendance
    attendance.push({ roll, name, status: 'Present', photo: imageData });
    localStorage.setItem('attendance', JSON.stringify(attendance));
    displayAttendance();
  }, 500);
}

// ---------------- QR Scan ----------------
function onScanSuccess(decodedText) {
  const [roll, name] = decodedText.split('|');
  if (!roll || !name) {
    alert('Invalid QR Code!');
    return;
  }

  // ✅ Check before capturing
  const isAlreadyPresent = attendance.some(a => a.roll === roll);
  if (isAlreadyPresent) {
    alert(`${name}'s attendance already done today!`);
    return;
  }

  captureImageAfter2Seconds(roll, name);
  alert('Attendance done');
  
}

function onScanError(err) {
  console.log(err);
}

const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
html5QrcodeScanner.render(onScanSuccess, onScanError);

// ---------------- Display Attendance ----------------
function displayAttendance() {
  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = "";

  const data = JSON.parse(localStorage.getItem("attendance")) || [];

  data.forEach(item => {
    let row = `
      <tr>
        <td>${item.roll}</td>
        <td>${item.name}</td>
        <td style="color: green; font-weight: bold;">${item.status}</td>
        <td>
          ${item.photo
            ? `<img src="${item.photo}" width="120" height="80" style="border-radius:8px; border:1px solid #ccc;">`
            : "—"}
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}
displayAttendance();

// ---------------- Download QR as Image ----------------
document.getElementById('downloadQrBtn').addEventListener('click', () => {
  const qrDisplayContainer = document.getElementById('qrDisplayContainer');
  html2canvas(qrDisplayContainer).then(canvas => {
    const link = document.createElement('a');
    link.download = 'qr_code.png';
    link.href = canvas.toDataURL();
    link.click();
  });
});

// ---------------- Clear Data ----------------
clrBtn.addEventListener('click', () => {
  if (confirm("Clear all attendance data?")) {
    localStorage.removeItem("attendance");
    attendance = [];
    displayAttendance();
  }
});


// ---------------- Export Attendance to PDF ----------------
document.getElementById('pdfBtn').addEventListener('click', () => {
  const data = JSON.parse(localStorage.getItem("attendance")) || [];
  const subject = document.getElementById('subject').value || "Not Selected";
  const date = document.getElementById('date').value || new Date().toLocaleDateString();

  if (data.length === 0) {
    alert("No attendance data to export!");
    return;
  }

  // Create new PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Title Section
  doc.setFontSize(16);
  doc.text("QR Code Attendance Report", 14, 15);
  doc.setFontSize(12);
  doc.text(`Subject: ${subject}`, 14, 25);
  doc.text(`Date: ${date}`, 14, 32);
  doc.line(14, 35, 195, 35);

  // Prepare table data
  const tableData = data.map((item, index) => [
    index + 1,
    item.roll,
    item.name,
    item.status,
  ]);

  // AutoTable
  doc.autoTable({
    startY: 40,
    head: [["S.No", "Roll No", "Name", "Status"]],
    body: tableData,
    theme: 'grid',
  });

  // Save file
  doc.save(`Attendance_${subject}_${date}.pdf`);
});