require("dotenv").config();
const { S3 } = require("@aws-sdk/client-s3");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const fs = require("fs");
const { Certificate, validateCertifacte } = require("../modal/cerificate");

const nodemailer = require("nodemailer");
const express = require("express");
const { decodeToken } = require("../helpers/decodeToken");
const router = express.Router();

// Configuration of the transporter for notification Email.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.COMPANY_EMAIL,
    pass: process.env.COMPANY_PASSWORD,
  },
});

// sending  certificate to institution.
function sendCertificateAwardEmailToInstitution(
  pladge,
  institutionEmail,
  name,
  phoneNumber,
  certificateName,
  completeFile,
  institution
) {
  // Compose the email message..
  const mailOptions = {
    from: process.env.COMPANY_EMAIL,
    to: institutionEmail,
    subject: "Certificate Award",
    html: `
      <p>Hello,</p>
      <p>Your  client in the names of  ${name}  has been awarded a  pledge cerficate    and  promised to  follow  50,20,30  rule for personal financial wellness 2023-2024 </p>
      <p>Phone ${phoneNumber}.</p>
    `,
  };

  // Send the email...
  transporter.sendMail(mailOptions, (recipientError, recipientInfo) => {
    if (recipientError) {
      console.error("Recipient Email Error:", recipientError);
    } else {
      console.log(
        "Recipient Certificate Award email sent:",
        recipientInfo.response
      );
    }
  });
}

// Sending the certificate award Email..
function sendCertificateAwardEmail(
  pladge,
  email,
  name,
  certificateName,
  completeFile,
  institution
) {
  // Compose the email message..
  const mailOptions = {
    from: process.env.COMPANY_EMAIL,
    to: email,
    subject: "Certificate Award",
    html: `
      <p>Hello ${name},</p>
      <p>You have been  awarded  a pledge certificate and  promise to follow 50,20,30 rule for your personal financial wellness 2023-2024 </p>
      <p>Thanks for saving with the ${institution}.</p>
    `,
    attachments: [
      {
        filename: certificateName,
        content: completeFile, // This should be the content of your PDF file
        contentType: "application/pdf",
      },
    ],
  };

  // Send the email...
  transporter.sendMail(mailOptions, (recipientError, recipientInfo) => {
    if (recipientError) {
      console.error("Recipient Email Error:", recipientError);
    } else {
      console.log(
        "Recipient Certificate Award email sent:",
        recipientInfo.response
      );
    }
  });
}

// IMPLMEMENTING THE ROUTES....
router.get("/", async (req, res) => {
  const token = req.header("Authorization");
  let certificates;

  if (!token) {
    certificates = await Certificate.find();
  } else {
    const decodedToken = decodeToken(token);
    certificates = await Certificate.find({ email: decodedToken.email });
  }
  res.send(certificates);
});

// Adding a new certificate to the collection....
router.post("/", async (req, res) => {
  //input validation using joi
  const { error } = validateCertifacte(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  // check if we are awarding certificate to a avalid user...
  //   let user = await User.findOne({ email: req.body.email });
  //   if (!user)
  //     return res
  //       .status(400)
  //       .send(
  //         "User with this email is not registered, therefore can't be awarded certificate ..."
  //       );

  const doc = new PDFDocument({
    layout: "landscape",
    size: "A4",
  });

  // Helper to move to next line...
  function jumpLine(doc, lines) {
    for (let index = 0; index < lines; index++) {
      doc.moveDown();
    }
  }

  doc
    .pipe(fs.createWriteStream("course_certificate.pdf"))
    .on("finish", async function () {
      console.log("Certificate PDF created and  closed successfully..");

      const pdfFilePath = "./course_certificate.pdf";

      if (!fs.existsSync(pdfFilePath)) {
        console.log("--------File does not exist-----------");
      } else {
        // create read stream and read file
        // Store the certificate to amazon aws...
        const aggregatedS3 = new S3({
          region: process.env.S3_BUCKET_REGION,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRETACCESS_KEY,
          },
        });

        // uploading the object to  the bucket...
        await aggregatedS3.putObject(
          {
            Key: `uibfs/${req.body.pladge}-${req.body.name}-certificate.pdf`,
            Bucket: process.env.S3_BUCKET_NAME,
            Body: fs.createReadStream(pdfFilePath),
            ContentType: "application/pdf",
          },
          (err, data) => {
            if (err) {
              console.log(err);
              return;
            }
            // console.log("DATA :", data);
            console.log("File uploaded successfully........");
          }
        );

        // Send the Notification Email to the user....
        const certificateName = `${req.body.pladge}-${req.body.name}-certificate.pdf`;
        const completeFile = fs.createReadStream(pdfFilePath);
        sendCertificateAwardEmailToInstitution(
          req.body.pladge,
          req.body.institutionEmail,
          req.body.name,
          req.body.phoneNumber,
          certificateName,
          completeFile,
          req.body.institution
        );
        sendCertificateAwardEmail(
          req.body.pladge,
          req.body.email,
          req.body.name,
          certificateName,
          completeFile,
          req.body.institution
        );
      }
    });

  doc.rect(0, 0, doc.page.width, doc.page.height).fill("#fff");

  doc.fontSize(10);

  // Margin
  const distanceMargin = 18;

  doc
    .fillAndStroke("#A8896A")
    .lineWidth(20)
    .lineJoin("round")
    .rect(
      distanceMargin,
      distanceMargin,
      doc.page.width - distanceMargin * 2,
      doc.page.height - distanceMargin * 2
    )
    .stroke();

  // Header
  const maxWidth = 200;
  const maxHeight = 100;

  doc.image("assets/awerenesslogo.jpg", doc.page.width / 2 - maxWidth / 2, 60, {
    fit: [maxWidth, maxHeight],
    align: "center",
  });

  jumpLine(doc, 5);

  doc
    .font("fonts/NotoSansJP-Light.otf")
    .fontSize(10)
    .fill("#021c27")
    .text("The Uganda Institute Of Banking And Financial Services ", {
      align: "center",
    });

  jumpLine(doc, 2);

  // Content
  doc
    .font("fonts/NotoSansJP-Regular.otf")
    .fontSize(16)
    .fill("#021c27")
    .text("PLEDGE CERTIFICATE ", {
      align: "center",
    });

  jumpLine(doc, 1);

  doc
    .font("fonts/NotoSansJP-Light.otf")
    .fontSize(10)
    .fill("#021c27")
    .text("Presented to", {
      align: "center",
    });

  jumpLine(doc, 2);

  doc
    .font("fonts/NotoSansJP-Bold.otf")
    .fontSize(24)
    .fill("#021c27")
    .text(`${req.body.name}`, {
      align: "center",
    });

  jumpLine(doc, 1);

  doc
    .font("fonts/NotoSansJP-Light.otf")
    .fontSize(10)
    .fill("#021c27")
    .text(
      `I Pledge To Follow 50,20,30 Rule For My Financial Willingness  2023-2024 `,
      {
        align: "center",
      }
    );

  jumpLine(doc, 7);

  doc.lineWidth(1);

  // Signatures
  // const lineSize = 174;
  // const signatureHeight = 390;

  // doc.fillAndStroke("#021c27");
  // doc.strokeOpacity(0.2);

  // const startLine1 = 128;
  // const endLine1 = 128 + lineSize;
  // doc
  //   .moveTo(startLine1, signatureHeight)
  //   .lineTo(endLine1, signatureHeight)
  //   .stroke();

  // const startLine2 = endLine1 + 32;
  // const endLine2 = startLine2 + lineSize;
  // doc
  //   .moveTo(startLine2, signatureHeight)
  //   .lineTo(endLine2, signatureHeight)
  //   .stroke();

  // const startLine3 = endLine2 + 32;
  // const endLine3 = startLine3 + lineSize;
  // doc
  //   .moveTo(startLine3, signatureHeight)
  //   .lineTo(endLine3, signatureHeight)
  //   .stroke();

  // doc
  //   .font("fonts/NotoSansJP-Bold.otf")
  //   .fontSize(10)
  //   .fill("#021c27")
  //   .text("Mr. Michael Mugabi", startLine1, signatureHeight + 10, {
  //     columns: 1,
  //     columnGap: 0,
  //     height: 40,
  //     width: lineSize,
  //     align: "center",
  //   });

  // doc
  //   .font("fonts/NotoSansJP-Light.otf")
  //   .fontSize(10)
  //   .fill("#021c27")
  //   .text(" Managing Director  Uibfs", startLine1, signatureHeight + 25, {
  //     columns: 1,
  //     columnGap: 0,
  //     height: 40,
  //     width: lineSize,
  //     align: "center",
  //   });

  // doc
  //   .font("fonts/NotoSansJP-Bold.otf")
  //   .fontSize(10)
  //   .fill("#021c27")
  //   .text("Ms. Goretti Masadde ", startLine2, signatureHeight + 10, {
  //     columns: 1,
  //     columnGap: 0,
  //     height: 40,
  //     width: lineSize,
  //     align: "center",
  //   });

  // doc
  //   .font("fonts/NotoSansJP-Light.otf")
  //   .fontSize(10)
  //   .fill("#021c27")
  //   .text("Ceo uibfs", startLine2, signatureHeight + 25, {
  //     columns: 1,
  //     columnGap: 0,
  //     height: 40,
  //     width: lineSize,
  //     align: "center",
  //   });

  // doc
  //   .font("fonts/NotoSansJP-Bold.otf")
  //   .fontSize(10)
  //   .fill("#021c27")
  //   .text("Jhon Amin", startLine3, signatureHeight + 10, {
  //     columns: 1,
  //     columnGap: 0,
  //     height: 40,
  //     width: lineSize,
  //     align: "center",
  //   });

  // doc
  //   .font("fonts/NotoSansJP-Light.otf")
  //   .fontSize(10)
  //   .fill("#021c27")
  //   .text("Director centinary group", startLine3, signatureHeight + 25, {
  //     columns: 1,
  //     columnGap: 0,
  //     height: 40,
  //     width: lineSize,
  //     align: "center",
  //   });

  jumpLine(doc, 4);

  // Validation liatnk
  const link = `https://uibfs.s3.eu-north-1.amazonaws.com/certificates/${req.body.pladge}-${req.body.name}-certificate.pdf`;

  doc.image("assets/bankers association.jpg", 100, 450, {
    fit: [200, 100],
    align: "left",
  });
  doc.image("assets/bou.jpg", 300, 450, {
    fit: [200, 72],
    align: "center",
  });
  doc.image("assets/logo3.jpg", 540, 470, {
    fit: [200, 100],
    align: "right",
  });

  async function generateQRCode() {
    try {
      const qrCodeData = req.body.name; // Replace with your URL or data

      // Generate QR code as a data URL
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeData);

      // Load the data URL as an image
      const qrCodeImage = doc.openImage(qrCodeDataURL);

      doc.image(qrCodeImage, 100, 60, {
        fit: [60, 60],
      });

      // Finalize the PDF
      doc.end();

      console.log("PDF with QR code generated successfully.");
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  }

  generateQRCode();

  // Saving the certificate to the  certificate collection in the  Database.........
  const certificate = new Certificate({
    name: req.body.name,
    pladge: req.body.pladge,
    link: link,
    email: req.body.email,
    institutionEmail: req.body.institutionEmail,
    amount: req.body.amount,
    phoneNumber: req.body.phoneNumber,
    frequency: req.body.frequency,
    institution: req.body.institution,
    insuranceCompany: req.body.insuranceCompany,
  });

  await certificate.save();

  res.status(200).send(certificate);
});





module.exports = router;
