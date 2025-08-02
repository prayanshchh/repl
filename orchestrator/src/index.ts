import express from "express";
import fs from "fs";
import yaml from "yaml";
import path from "path";
import cors from "cors";
import { KubeConfig, AppsV1Api, CoreV1Api, NetworkingV1Api } from "@kubernetes/client-node";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const kubeconfig = new KubeConfig();
kubeconfig.loadFromDefault();

const coreV1Api = kubeconfig.makeApiClient(CoreV1Api);
const appsV1Api = kubeconfig.makeApiClient(AppsV1Api);
const networkingV1Api = kubeconfig.makeApiClient(NetworkingV1Api);

const readAndParseKubeYaml = (filePath: string, replId: string): Array<any> => {
    const fileContent = fs.readFileSync(filePath, "utf8");
  
    const docs = yaml.parseAllDocuments(fileContent).map((doc) => {
      let docString = doc.toString();
  
      const replacements: Record<string, string> = {
        service_name: replId,
        SAVE_SERVICE_URL_PLACEHOLDER: process.env.SAVE_SERVICE_URL || "",
        GCS_BUCKET_PLACEHOLDER: process.env.GCS_BUCKET || "",
      };
  
      for (const [placeholder, value] of Object.entries(replacements)) {
        const regex = new RegExp(placeholder, "g");
        docString = docString.replace(regex, value);
      }
  
      return yaml.parse(docString);
    });
    return docs;
  };

app.post("/start", async (req, res) => {
    const { replId } = req.body;
    const namespace = "default";

    try {
        const kubeManifests = readAndParseKubeYaml(path.join(__dirname, "../service.yaml"), replId);
        for (const manifest of kubeManifests) {
            switch (manifest.kind) {
                case "Deployment":
                    await appsV1Api.createNamespacedDeployment({
                        namespace,
                        body: manifest, 
                      });
                    break;
                case "Service":
                    await coreV1Api.createNamespacedService({
                        namespace,
                        body: manifest,
                      });
                    break;
                case "Ingress":
                    await networkingV1Api.createNamespacedIngress({
                        namespace,
                        body: manifest,
                      });
                    break;
                default:
                    console.log(`Unsupported kind: ${manifest.kind}`);
            }
        }
        res.status(200).send({ message: "Resources created successfully" });
    } catch (error) {
        console.error("Failed to create resources", error);
        res.status(500).send({ message: "Failed to create resources" });
    }
});

app.post("/stop", async (req, res) => {
  const { replId } = req.body;
  const namespace = "default";

  try {
    await networkingV1Api.deleteNamespacedIngress({
      name: replId,
      namespace: "default",
    });
    
    await coreV1Api.deleteNamespacedService({name: replId, namespace});
    console.log(`Service ${replId} deleted`);

    await appsV1Api.deleteNamespacedDeployment({name: replId, namespace});
    console.log(`Deployment ${replId} deleted`);

    res.status(200).send({ message: `Resources for ${replId} deleted successfully` });
  } catch (error: any) {
    console.error(`Failed to delete resources for ${replId}`, error?.body || error);
    res.status(500).send({ message: `Failed to delete resources for ${replId}`, error: error?.body || error });
  }
});

const port = process.env.PORT || 3002;
app.listen(port, () => {
    console.log(`Listening on port: ${port}`);
});