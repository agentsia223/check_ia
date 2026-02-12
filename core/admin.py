from django.contrib import admin
from .models import Fact, Submission, VerifiedMedia, Keyword

admin.site.register(Fact)
admin.site.register(Submission)
admin.site.register(VerifiedMedia)
admin.site.register(Keyword)