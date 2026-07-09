from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Custom claims
        token['pme_id'] = user.pme.id if user.pme else None
        token['role'] = user.role
        token['email'] = user.email

        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        request = self.context.get('request')
        source = request.data.get('source') if request else None
        
        from rest_framework import serializers
        
        if self.user.role == 'operateur':
            if source != 'admin_portal':
                raise serializers.ValidationError(
                    {"detail": "Les administrateurs doivent se connecter uniquement via le portail interne."}
                )
        else:
            if source == 'admin_portal':
                raise serializers.ValidationError(
                    {"detail": "Ce portail est réservé aux administrateurs."}
                )
        
        # Include extra info in response body if needed
        data['user'] = {
            'email': self.user.email,
            'role': self.user.role,
            'pme_id': self.user.pme.id if self.user.pme else None,
            'pme_nom': self.user.pme.nom if self.user.pme else None,
        }
        return data
