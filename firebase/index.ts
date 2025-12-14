import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve('firebase/serviceAccountKey.json'), 'utf8'));

console.log({ serviceAccount })

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export { admin };
