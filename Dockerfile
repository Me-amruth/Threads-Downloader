FROM node:14
RUN git clone https://github.com/Me-amruth/Threads-Downloader /threads
WORKDIR /threads
COPY package*.json ./
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "index.js"]
