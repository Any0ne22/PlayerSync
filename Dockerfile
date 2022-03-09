FROM python:3.10

WORKDIR /code

COPY ./backend/requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./backend /code/backend


EXPOSE 80

CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000"]
