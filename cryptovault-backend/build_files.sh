#!/bin/bash

# Install all dependencies
pip install -r requirements.txt

# Collect static files for Django admin
python manage.py collectstatic --noinput
