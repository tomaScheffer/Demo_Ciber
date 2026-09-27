FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY metadata.json /usr/share/nginx/metadata/metadata.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
