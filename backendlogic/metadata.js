const exif = require('exifr');
const path =require('path')
const fs = require('fs');
const winston = require('../security/winston');

const suspicioussoftware = [
  "adobe photoshop",
  "gimp",
  "canva",
  "paint",
  "lightroom",
  "affinity",
  "pixelmator",
  "snapseed",
];

const metadata= async(files)=>{
    const flags = [];

    for(const fieldname of Object.keys(files)){
        const file = files[fieldname][0];

        if(file.mimetype==='application/pdf'){continue};

        try {

            const metadata = await exif.parse(file.path);
            if(!metadata){
                flags.push({field:fieldname,reason:'no metadata found maybe a screenshot'});
                continue;
            }

            const editedsoftware = metadata?.software?.toLowerCase()||"";
            if(suspicioussoftware.some((s)=>editedsoftware.includes(s))){
                flags.push({field:fieldname,reason:`Document may have been edited`});
            
            }


            if(!metadata.model&&!metadata.make){
                flags.push({field:fieldname,reason:'No camera information found'});
            }

            if(!metadata.DateTimeOriginal){
                flags.push({field:fieldname,reason:'Suspicous time noted'})
            };


            
        } catch (error) {
            winston.error(error)
            flags.push({field:fieldname,reason:`failed to obtain meta data from ${fieldname} `})
        }
    }
    return flags;
}
module.exports=metadata