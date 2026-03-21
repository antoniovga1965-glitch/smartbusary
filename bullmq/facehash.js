const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');
const {Canvas,Image,ImageData} = canvas;
const path = require('path');
const prisma = require('../prisma.client');



faceapi.env.monkeyPatch({Canvas,Image,ImageData});

const MODEL_PATH = path.join(__dirname,'../public/models');

let modelloaded = false;

const loadmodels = async()=>{

    if(modelloaded)return;

    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH);
    modelloaded = true;


}

const extractfaceDesciptor = async(imagepath)=>{
    if(!imagepath) return null;

    try {
        await loadmodels();

        const image = await canvas.loadImage(imagepath);
        
        const detections = await faceapi.detectAllFaces(image,new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
       
      

        if(!detections||detections.length===0){
            return null;
        };


        if(detections.length>1){
            return null;
        };


        const detection = detections[0];


        if(detection.detection.score<0.8){
            return null;
        }console.log(` Face extracted — confidence: ${detection.detection.score.toFixed(2)}`); 

        return Array.from(detection.descriptor);

        
    } catch (error) {
        console.error(error);

        return null;
    }
}

    const issameperson = (descriptor1,descriptor2)=>{
     const person1 = new Float32Array(descriptor1);
     const person2 = new Float32Array(descriptor2);

     const distance = faceapi.euclideanDistance(person1,person2);
     return distance<0.5
    }

    const checkface = async(passportphoto,applicantid)=>{
      
        const flags = [];

        try {
            const newdescriptor = await extractfaceDesciptor(passportphoto);
            

            if(!newdescriptor){
                flags.push({reason:'Face couldnt be processed or not read clearly'})
                 return { flags, descriptor: null };
            }

            const checkexisitingface = await prisma.Application.findMany({
                where:{
                    NOT:{id:applicantid},
                    faceDescriptor:{isEmpty:false},
                },select:{
                    id:true,
                    nameinput:true,
                    faceDescriptor:true,
                }

            })
               


            for(const existing of checkexisitingface){
                if(!existing.faceDescriptor||existing.faceDescriptor.length===0)continue;

                const match = issameperson(newdescriptor,existing.faceDescriptor);

                if(match){
                    flags.push({reason:`Face matches existing ${existing.id}  ${existing.nameinput}`})
                    break;
                }
            
            }

            return ({flags,descriptor:newdescriptor});

        } catch (error) {
            
             console.error(`Face check failed: ${error}`);
             flags.push({ reason: 'Face verification failed — could not complete biometric check' });
              return { flags, descriptor: null };
        }
    }

    module.exports = {checkface,extractfaceDesciptor};